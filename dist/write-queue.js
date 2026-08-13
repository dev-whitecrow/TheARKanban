import { Mutex } from 'async-mutex';
import { EventEmitter } from 'node:events';
import { consola } from 'consola';
import { writeTaskFile, deleteTaskFile, getNextId, buildNewTask, } from './file-manager.js';
import { isValidTransition, } from './schema.js';
// ─── Write Queue ───────────────────────────────────────────────
const mutex = new Mutex();
export const taskEvents = new EventEmitter();
/**
 * Execute a write operation through the mutex queue.
 * All file mutations MUST go through this function.
 */
async function enqueue(operation) {
    const release = await mutex.acquire();
    try {
        return await operation();
    }
    finally {
        release();
    }
}
/**
 * Create a new task.
 * Generates a new ID, writes the file, and emits an event.
 */
export async function createTask(input, source = 'api') {
    return enqueue(async () => {
        const id = await getNextId();
        const task = buildNewTask(id, input);
        await writeTaskFile(task);
        consola.success(`[${source}] Created ${task.frontmatter.id}: ${task.frontmatter.title}`);
        taskEvents.emit('task:event', {
            type: 'task:created',
            task,
            source,
        });
        return task;
    });
}
/**
 * Update an existing task.
 * Validates status transitions if status is being changed.
 */
export async function updateTask(existingTask, input, source = 'api') {
    return enqueue(async () => {
        // Validate status transition if changing status
        if (input.status && input.status !== existingTask.frontmatter.status) {
            if (!isValidTransition(existingTask.frontmatter.status, input.status)) {
                throw new Error(`Invalid status transition: ${existingTask.frontmatter.status} → ${input.status}`);
            }
        }
        const now = new Date().toISOString();
        // Build updated frontmatter
        const updatedFrontmatter = { ...existingTask.frontmatter };
        if (input.title !== undefined)
            updatedFrontmatter.title = input.title;
        if (input.status !== undefined)
            updatedFrontmatter.status = input.status;
        if (input.priority !== undefined)
            updatedFrontmatter.priority = input.priority;
        if (input.tags !== undefined)
            updatedFrontmatter.tags = input.tags;
        // Handle nullable fields
        if (input.assignee === null) {
            updatedFrontmatter.assignee = undefined;
        }
        else if (input.assignee !== undefined) {
            updatedFrontmatter.assignee = input.assignee;
        }
        if (input.dueDate === null) {
            updatedFrontmatter.dueDate = undefined;
        }
        else if (input.dueDate !== undefined) {
            updatedFrontmatter.dueDate = input.dueDate;
        }
        updatedFrontmatter.updatedAt = now;
        // Build activity log entry
        const changes = [];
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
            }
            else {
                body += `\n\n## Activity Log\n${logEntry}`;
            }
        }
        const updatedTask = {
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
        });
        return updatedTask;
    });
}
/**
 * Move a task to a new status (convenience wrapper around updateTask).
 */
export async function moveTask(existingTask, newStatus, source = 'api') {
    return updateTask(existingTask, { status: newStatus }, source);
}
/**
 * Add a note to a task's Activity Log.
 */
export async function addNote(existingTask, note, author, source = 'api') {
    return enqueue(async () => {
        const now = new Date().toISOString();
        const logEntry = `- [${now.slice(0, 16).replace('T', ' ')}] ${author}: ${note}`;
        let body = existingTask.body;
        if (body.includes('## Activity Log')) {
            body = body.replace('## Activity Log', `## Activity Log\n${logEntry}`);
        }
        else {
            body += `\n\n## Activity Log\n${logEntry}`;
        }
        const updatedTask = {
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
        });
        return updatedTask;
    });
}
/**
 * Delete a task.
 */
export async function removeTask(existingTask, source = 'api') {
    return enqueue(async () => {
        await deleteTaskFile(existingTask.filePath);
        consola.success(`[${source}] Deleted ${existingTask.frontmatter.id}`);
        taskEvents.emit('task:event', {
            type: 'task:deleted',
            task: existingTask,
            source,
        });
    });
}
//# sourceMappingURL=write-queue.js.map