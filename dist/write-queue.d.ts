import { EventEmitter } from 'node:events';
import { type Task, type CreateTaskInput, type UpdateTaskInput, type TaskStatus } from './schema.js';
export type TaskEventType = 'task:created' | 'task:updated' | 'task:deleted';
export interface TaskEvent {
    type: TaskEventType;
    task: Task;
    source: string;
}
export declare const taskEvents: EventEmitter<any>;
/**
 * Create a new task.
 * Generates a new ID, writes the file, and emits an event.
 */
export declare function createTask(input: CreateTaskInput, source?: string): Promise<Task>;
/**
 * Update an existing task.
 * Validates status transitions if status is being changed.
 */
export declare function updateTask(existingTask: Task, input: UpdateTaskInput, source?: string): Promise<Task>;
/**
 * Move a task to a new status (convenience wrapper around updateTask).
 */
export declare function moveTask(existingTask: Task, newStatus: TaskStatus, source?: string): Promise<Task>;
/**
 * Add a note to a task's Activity Log.
 */
export declare function addNote(existingTask: Task, note: string, author: string, source?: string): Promise<Task>;
/**
 * Delete a task.
 */
export declare function removeTask(existingTask: Task, source?: string): Promise<void>;
//# sourceMappingURL=write-queue.d.ts.map