import { Mutex } from 'async-mutex';
import { EventEmitter } from 'node:events';
import { consola } from 'consola';
import {
  writeTaskFile,
  deleteTaskFile,
  getNextId,
  buildNewTask,
  parseTaskFile,
} from './file-manager.js';
import {
  type Task,
  type CreateTaskInput,
  type UpdateTaskInput,
  isValidTransition,
  type TaskStatus,
} from './schema.js';
import path from 'node:path';
import { getTasksDir } from './file-manager.js';
import { getKSTISOString } from './utils.js';

// ─── Events ────────────────────────────────────────────────────
export type TaskEventType = 'task:created' | 'task:updated' | 'task:deleted';

export interface TaskEvent {
  type: TaskEventType;
  task: Task;
  source: string;  // 'api' | 'discord' | 'mcp' | 'cli' | 'file-watch'
}

// ─── Write Queue ───────────────────────────────────────────────
const mutex = new Mutex();
export const taskEvents = new EventEmitter();

/**
 * Execute a write operation through the mutex queue.
 * All file mutations MUST go through this function.
 */
async function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const release = await mutex.acquire();
  try {
    return await operation();
  } finally {
    release();
  }
}

/**
 * Create a new task.
 * Generates a new ID, writes the file, and emits an event.
 */
export async function createTask(
  input: CreateTaskInput,
  source: string = 'api',
): Promise<Task> {
  return enqueue(async () => {
    const id = await getNextId();
    const task = buildNewTask(id, input);
    await writeTaskFile(task);

    consola.success(`[${source}] Created ${task.frontmatter.id}: ${task.frontmatter.title}`);
    taskEvents.emit('task:event', {
      type: 'task:created',
      task,
      source,
    } satisfies TaskEvent);

    return task;
  });
}

/**
 * Update an existing task.
 * Validates status transitions if status is being changed.
 */
export async function updateTask(
  existingTask: Task,
  input: UpdateTaskInput,
  source: string = 'api',
): Promise<Task> {
  return enqueue(async () => {
    // Validate status transition if changing status
    if (input.status && input.status !== existingTask.frontmatter.status) {
      if (!isValidTransition(existingTask.frontmatter.status, input.status)) {
        throw new Error(
          `Invalid status transition: ${existingTask.frontmatter.status} → ${input.status}`,
        );
      }
    }

    const now = getKSTISOString();

    // Build updated frontmatter
    const updatedFrontmatter = { ...existingTask.frontmatter };
    if (input.title !== undefined) updatedFrontmatter.title = input.title;
    if (input.status !== undefined) updatedFrontmatter.status = input.status;
    if (input.priority !== undefined) updatedFrontmatter.priority = input.priority;
    if (input.tags !== undefined) updatedFrontmatter.tags = input.tags;

    // Handle nullable fields
    if (input.assignee === null) {
      updatedFrontmatter.assignee = undefined;
    } else if (input.assignee !== undefined) {
      updatedFrontmatter.assignee = input.assignee;
    }

    if (input.dueDate === null) {
      updatedFrontmatter.dueDate = undefined;
    } else if (input.dueDate !== undefined) {
      updatedFrontmatter.dueDate = input.dueDate;
    }

    if (input.epic === null) {
      updatedFrontmatter.epic = undefined;
    } else if (input.epic !== undefined) {
      updatedFrontmatter.epic = input.epic;
    }

    updatedFrontmatter.updatedAt = now;

    // Build activity log entry
    const changes: string[] = [];
    if (input.status && input.status !== existingTask.frontmatter.status) {
      changes.push(`status → ${input.status}`);
    }
    if (input.assignee !== undefined && input.assignee !== existingTask.frontmatter.assignee) {
      changes.push(`assignee → ${input.assignee ?? 'unassigned'}`);
    }
    if (input.priority && input.priority !== existingTask.frontmatter.priority) {
      changes.push(`priority → ${input.priority}`);
    }

    let body = input.body ?? existingTask.body;
    if (changes.length > 0) {
      const logEntry = `- [${now.slice(0, 16).replace('T', ' ')}] ${changes.join(', ')} (via ${source})`;
      // Append to Activity Log section
      if (body.includes('## Activity Log')) {
        body = body.replace('## Activity Log', `## Activity Log\n${logEntry}`);
      } else {
        body += `\n\n## Activity Log\n${logEntry}`;
      }
    }

    const updatedTask: Task = {
      frontmatter: updatedFrontmatter,
      body,
      filePath: existingTask.filePath,
    };

    await writeTaskFile(updatedTask);

    consola.success(`[${source}] Updated ${updatedTask.frontmatter.id}: ${changes.join(', ') || 'body'}`);
    taskEvents.emit('task:event', {
      type: 'task:updated',
      task: updatedTask,
      source,
    } satisfies TaskEvent);

    return updatedTask;
  });
}

/**
 * Move a task to a new status (convenience wrapper around updateTask).
 */
export async function moveTask(
  existingTask: Task,
  newStatus: TaskStatus,
  source: string = 'api',
): Promise<Task> {
  return updateTask(existingTask, { status: newStatus }, source);
}

/**
 * Add a note to a task's Activity Log.
 */
export async function addNote(
  existingTask: Task,
  note: string,
  author: string,
  source: string = 'api',
): Promise<Task> {
  return enqueue(async () => {
    const now = getKSTISOString();
    const logEntry = `- [${now.slice(0, 16).replace('T', ' ')}] ${author}: ${note}`;

    let body = existingTask.body;
    if (body.includes('## Activity Log')) {
      body = body.replace('## Activity Log', `## Activity Log\n${logEntry}`);
    } else {
      body += `\n\n## Activity Log\n${logEntry}`;
    }

    const updatedTask: Task = {
      ...existingTask,
      frontmatter: {
        ...existingTask.frontmatter,
        updatedAt: now,
      },
      body,
    };

    await writeTaskFile(updatedTask);

    consola.success(`[${source}] Note added to ${updatedTask.frontmatter.id} by ${author}`);
    taskEvents.emit('task:event', {
      type: 'task:updated',
      task: updatedTask,
      source,
    } satisfies TaskEvent);

    return updatedTask;
  });
}

/**
 * Delete a task.
 */
export async function removeTask(
  existingTask: Task,
  source: string = 'api',
): Promise<void> {
  return enqueue(async () => {
    await deleteTaskFile(existingTask.filePath);

    consola.success(`[${source}] Deleted ${existingTask.frontmatter.id}`);
    taskEvents.emit('task:event', {
      type: 'task:deleted',
      task: existingTask,
      source,
    } satisfies TaskEvent);
  });
}
