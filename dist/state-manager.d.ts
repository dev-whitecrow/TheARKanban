import type { Task, BoardState, TaskStatus } from './schema.js';
export declare function getTask(id: string): Task | undefined;
export declare function getAllTasks(): Task[];
export declare function getTasksByStatus(status: TaskStatus): Task[];
export declare function getTasksByAssignee(assignee: string): Task[];
export declare function getBoardState(): Promise<BoardState>;
export declare function getHealthInfo(): {
    status: string;
    totalTasks: number;
    lastSync: string;
    uptime: number;
};
/**
 * Boot the state manager:
 * 1. Bulk-scan all existing MD files into memory
 * 2. Start chokidar watcher for incremental updates
 * 3. Listen to write-queue events for internal mutations
 */
export declare function initStateManager(): Promise<void>;
//# sourceMappingURL=state-manager.d.ts.map