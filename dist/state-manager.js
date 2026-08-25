import path from 'node:path';
import chokidar from 'chokidar';
import { consola } from 'consola';
import { scanAllTasks, parseTaskFile, readMeta, getTasksDir, } from './file-manager.js';
import { taskEvents } from './write-queue.js';
import { getKSTISOString } from './utils.js';
// ─── In-Memory State ───────────────────────────────────────────
const taskMap = new Map();
let lastSyncTime = getKSTISOString();
let kanbanMeta = null;
// Debounce tracking for chokidar
const pendingChanges = new Map();
const DEBOUNCE_MS = 100;
// ─── Getters ───────────────────────────────────────────────────
export function getTask(id) {
    return taskMap.get(id);
}
export function getAllTasks() {
    return Array.from(taskMap.values());
}
export function getTasksByStatus(status) {
    return getAllTasks().filter((t) => t.frontmatter.status === status);
}
export function getTasksByAssignee(assignee) {
    return getAllTasks().filter((t) => t.frontmatter.assignee === assignee);
}
export async function getBoardState() {
    const meta = kanbanMeta ?? await readMeta();
    const allTasks = getAllTasks();
    const activeTasks = allTasks.filter(t => !t.frontmatter.isTemplate);
    const templates = allTasks.filter(t => t.frontmatter.isTemplate).map(t => t.frontmatter);
    return {
        columns: meta.columns.map((colId) => ({
            id: colId,
            label: meta.columnLabels[colId] ?? colId,
            tasks: activeTasks
                .filter((t) => t.frontmatter.status === colId)
                .sort((a, b) => {
                // Sort by priority (urgent > high > medium > low), then by updatedAt desc
                const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                const pa = priorityOrder[a.frontmatter.priority] ?? 2;
                const pb = priorityOrder[b.frontmatter.priority] ?? 2;
                if (pa !== pb)
                    return pa - pb;
                return b.frontmatter.updatedAt.localeCompare(a.frontmatter.updatedAt);
            })
                .map((t) => t.frontmatter),
        })),
        templates,
        totalTasks: activeTasks.length,
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
function upsertTask(task) {
    taskMap.set(task.frontmatter.id, task);
    lastSyncTime = getKSTISOString();
}
function removeFromState(id) {
    taskMap.delete(id);
    lastSyncTime = getKSTISOString();
}
// ─── Initialization ────────────────────────────────────────────
/**
 * Boot the state manager:
 * 1. Bulk-scan all existing MD files into memory
 * 2. Start chokidar watcher for incremental updates
 * 3. Listen to write-queue events for internal mutations
 */
export async function initStateManager() {
    // Load meta
    kanbanMeta = await readMeta();
    // 1. Bulk scan
    const tasks = await scanAllTasks();
    for (const task of tasks) {
        taskMap.set(task.frontmatter.id, task);
    }
    lastSyncTime = getKSTISOString();
    consola.info(`State initialized with ${taskMap.size} task(s)`);
    // 2. Start file watcher
    startFileWatcher();
    // 3. Listen to write-queue events to keep in-memory state in sync
    taskEvents.on('task:event', (event) => {
        if (event.type === 'task:deleted') {
            removeFromState(event.task.frontmatter.id);
        }
        else {
            upsertTask(event.task);
        }
    });
}
// ─── File Watcher (chokidar) ───────────────────────────────────
function startFileWatcher() {
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
function handleFileChange(relativePath, eventType) {
    const tasksDir = getTasksDir();
    const fullPath = path.join(tasksDir, relativePath);
    // Debounce: clear any pending timeout for this file
    const existing = pendingChanges.get(fullPath);
    if (existing)
        clearTimeout(existing);
    pendingChanges.set(fullPath, setTimeout(async () => {
        pendingChanges.delete(fullPath);
        const task = await parseTaskFile(fullPath);
        if (!task)
            return;
        // Check if this is a change from an external source (IDE, manual edit)
        const existingTask = taskMap.get(task.frontmatter.id);
        const isExternalChange = !existingTask ||
            existingTask.frontmatter.updatedAt !== task.frontmatter.updatedAt ||
            existingTask.body !== task.body ||
            JSON.stringify(existingTask.frontmatter) !== JSON.stringify(task.frontmatter);
        upsertTask(task);
        if (isExternalChange) {
            consola.info(`[file-watch] Detected external ${eventType}: ${task.frontmatter.id}`);
            taskEvents.emit('task:event', {
                type: eventType === 'add' ? 'task:created' : 'task:updated',
                task,
                source: 'file-watch',
            });
        }
    }, DEBOUNCE_MS));
}
function handleFileUnlink(relativePath) {
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
        });
    }
}
//# sourceMappingURL=state-manager.js.map