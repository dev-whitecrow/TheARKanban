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
  changes?: string[];
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

    if (input.isTemplate === false) {
      delete updatedFrontmatter.isTemplate;
    } else if (input.isTemplate !== undefined) {
      updatedFrontmatter.isTemplate = input.isTemplate;
    }
    
    if (input.recurrence === null) {
      delete updatedFrontmatter.recurrence;
    } else if (input.recurrence !== undefined) {
      updatedFrontmatter.recurrence = input.recurrence;
    }

    if (input.nextRecurAt === null) {
      delete updatedFrontmatter.nextRecurAt;
    } else if (input.nextRecurAt !== undefined) {
      updatedFrontmatter.nextRecurAt = input.nextRecurAt;
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
    if (input.title && input.title !== existingTask.frontmatter.title) {
      changes.push(`title → ${input.title}`);
    }
    if (input.dueDate !== undefined && input.dueDate !== existingTask.frontmatter.dueDate) {
      changes.push(`dueDate → ${input.dueDate ?? 'cleared'}`);
    }
    if (input.epic !== undefined && input.epic !== existingTask.frontmatter.epic) {
      changes.push(`epic → ${input.epic ?? 'cleared'}`);
    }

    // Reconstruct body to protect the Activity Log ledger
    let body = existingTask.body;
    
    // 1. Extract existing Activity Log
    const existingParts = existingTask.body.split('## Activity Log');
    const existingActivityLog = existingParts.length > 1 ? `## Activity Log${existingParts[1]}` : '';

    // 2. If frontend sent a new body, wrap it in ## Notes and strip any accidentally sent Activity Logs
    if (input.body !== undefined) {
      const inputParts = input.body.split('## Activity Log');
      const pureUserNotes = inputParts[0].trimEnd();
      body = `## Notes\n${pureUserNotes}\n\n${existingActivityLog}`.trim();
    }

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

    // body change detection — after Activity Log write so it only goes to the event, not the log
    if (input.body !== undefined) {
      changes.push('📝 Notes 변경됨');
    }

    consola.success(`[${source}] Updated ${updatedTask.frontmatter.id}: ${changes.join(', ') || 'body'}`);
    taskEvents.emit('task:event', {
      type: 'task:updated',
      task: updatedTask,
      source,
      changes: changes.length > 0 ? changes : undefined,
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
      changes: [`💬 ${author}: ${note.slice(0, 50)}${note.length > 50 ? '…' : ''}`],
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
