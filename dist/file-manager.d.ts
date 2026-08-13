import { type Task, type KanbanMeta, type CreateTaskInput } from './schema.js';
export declare function getTasksDir(): string;
export declare function readMeta(): Promise<KanbanMeta>;
export declare function writeMeta(meta: KanbanMeta): Promise<void>;
export declare function getNextId(): Promise<string>;
/**
 * Parse a single .md task file into a Task object.
 * Returns null if file is invalid (graceful degradation).
 */
export declare function parseTaskFile(filePath: string): Promise<Task | null>;
/**
 * Write a Task object to a .md file.
 * Creates the file if it doesn't exist.
 */
export declare function writeTaskFile(task: Task): Promise<void>;
/**
 * Delete a task file.
 */
export declare function deleteTaskFile(filePath: string): Promise<void>;
/**
 * Build a Task object from CreateTaskInput + generated ID.
 */
export declare function buildNewTask(id: string, input: CreateTaskInput): Task;
/**
 * Scan all task files from the tasks directory.
 * Used for initial boot-up state building.
 */
export declare function scanAllTasks(): Promise<Task[]>;
//# sourceMappingURL=file-manager.d.ts.map