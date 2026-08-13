import path from 'node:path';
import chokidar from 'chokidar';
import { consola } from 'consola';
import {
  scanAllTasks,
  parseTaskFile,
  readMeta,
  getTasksDir,
} from './file-manager.js';
import { taskEvents, type TaskEvent } from './write-queue.js';
import type { Task, TaskFrontmatter, BoardState, TaskStatus, KanbanMeta } from './schema.js';

// ─── In-Memory State ───────────────────────────────────────────
const taskMap = new Map<string, Task>();
let lastSyncTime: string = new Date().toISOString();
let kanbanMeta: KanbanMeta | null = null;

// Debounce tracking for chokidar
const pendingChanges = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 100;

// ─── Getters ───────────────────────────────────────────────────

export function getTask(id: string): Task | undefined {
  return taskMap.get(id);
}

export function getAllTasks(): Task[] {
  return Array.from(taskMap.values());
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  return getAllTasks().filter((t) => t.frontmatter.status === status);
}

export function getTasksByAssignee(assignee: string): Task[] {
  return getAllTasks().filter((t) => t.frontmatter.assignee === assignee);
}

export async function getBoardState(): Promise<BoardState> {
  const meta = kanbanMeta ?? await readMeta();
  const allTasks = getAllTasks();

  return {
    columns: meta.columns.map((colId) => ({
      id: colId,
      label: meta.columnLabels[colId] ?? colId,
      tasks: allTasks
        .filter((t) => t.frontmatter.status === colId)
        .sort((a, b) => {
          // Sort by priority (urgent > high > medium > low), then by updatedAt desc
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          const pa = priorityOrder[a.frontmatter.priority] ?? 2;
          const pb = priorityOrder[b.frontmatter.priority] ?? 2;
          if (pa !== pb) return pa - pb;
          return b.frontmatter.updatedAt.localeCompare(a.frontmatter.updatedAt);
        })
        .map((t) => t.frontmatter),
    })),
    totalTasks: allTasks.length,
    lastSync: lastSyncTime,
  };
}

export function getHealthInfo() {
  return {
    status: 'ok',
    totalTasks: taskMap.size,
    lastSync: lastSyncTime,
    uptime: process.uptime(),
  };
}

// ─── State Mutation (internal only) ────────────────────────────

function upsertTask(task: Task): void {
  taskMap.set(task.frontmatter.id, task);
  lastSyncTime = new Date().toISOString();
}

function removeFromState(id: string): void {
  taskMap.delete(id);
  lastSyncTime = new Date().toISOString();
}

// ─── Initialization ────────────────────────────────────────────

/**
 * Boot the state manager:
 * 1. Bulk-scan all existing MD files into memory
 * 2. Start chokidar watcher for incremental updates
 * 3. Listen to write-queue events for internal mutations
 */
export async function initStateManager(): Promise<void> {
  // Load meta
  kanbanMeta = await readMeta();

  // 1. Bulk scan
  const tasks = await scanAllTasks();
  for (const task of tasks) {
    taskMap.set(task.frontmatter.id, task);
  }
  lastSyncTime = new Date().toISOString();
  consola.info(`State initialized with ${taskMap.size} task(s)`);

  // 2. Start file watcher
  startFileWatcher();

  // 3. Listen to write-queue events to keep in-memory state in sync
  taskEvents.on('task:event', (event: TaskEvent) => {
    if (event.type === 'task:deleted') {
      removeFromState(event.task.frontmatter.id);
    } else {
      upsertTask(event.task);
    }
  });
}

// ─── File Watcher (chokidar) ───────────────────────────────────

function startFileWatcher(): void {
  const tasksDir = getTasksDir();
  const watcher = chokidar.watch('*.md', {
    cwd: tasksDir,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('add', (relativePath) => handleFileChange(relativePath, 'add'));
  watcher.on('change', (relativePath) => handleFileChange(relativePath, 'change'));
  watcher.on('unlink', (relativePath) => handleFileUnlink(relativePath));

  watcher.on('ready', () => {
    consola.info(`File watcher active on ${tasksDir}`);
  });

  watcher.on('error', (err) => {
    consola.error('File watcher error:', err);
  });
}

function handleFileChange(relativePath: string, eventType: 'add' | 'change'): void {
  const tasksDir = getTasksDir();
  const fullPath = path.join(tasksDir, relativePath);

  // Debounce: clear any pending timeout for this file
  const existing = pendingChanges.get(fullPath);
  if (existing) clearTimeout(existing);

  pendingChanges.set(
    fullPath,
    setTimeout(async () => {
      pendingChanges.delete(fullPath);

      const task = await parseTaskFile(fullPath);
      if (!task) return;

      // Check if this is a change from an external source (IDE, manual edit)
      const existingTask = taskMap.get(task.frontmatter.id);
      const isExternalChange =
        !existingTask ||
        existingTask.frontmatter.updatedAt !== task.frontmatter.updatedAt;

      upsertTask(task);

      if (isExternalChange) {
        consola.info(`[file-watch] Detected external ${eventType}: ${task.frontmatter.id}`);
        taskEvents.emit('task:event', {
          type: eventType === 'add' ? 'task:created' : 'task:updated',
          task,
          source: 'file-watch',
        } satisfies TaskEvent);
      }
    }, DEBOUNCE_MS),
  );
}

function handleFileUnlink(relativePath: string): void {
  const fileName = path.basename(relativePath, '.md');

  // Try to find by filename (TASK-001.md → TASK-001)
  const task = taskMap.get(fileName);
  if (task) {
    removeFromState(fileName);
    consola.info(`[file-watch] Detected deletion: ${fileName}`);
    taskEvents.emit('task:event', {
      type: 'task:deleted',
      task,
      source: 'file-watch',
    } satisfies TaskEvent);
  }
}
