import { z } from 'zod';
export declare const TaskStatus: z.ZodEnum<{
    blocked: "blocked";
    done: "done";
    "in-progress": "in-progress";
    review: "review";
    todo: "todo";
}>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export declare const TaskPriority: z.ZodEnum<{
    high: "high";
    low: "low";
    medium: "medium";
    urgent: "urgent";
}>;
export type TaskPriority = z.infer<typeof TaskPriority>;
export declare const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]>;
export declare function isValidTransition(from: TaskStatus, to: TaskStatus): boolean;
export declare const TaskFrontmatterSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<{
        blocked: "blocked";
        done: "done";
        "in-progress": "in-progress";
        review: "review";
        todo: "todo";
    }>>;
    assignee: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
        urgent: "urgent";
    }>>;
    dueDate: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    epic: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    isTemplate: z.ZodOptional<z.ZodBoolean>;
    recurrence: z.ZodOptional<z.ZodEnum<{
        daily: "daily";
        weekly: "weekly";
    }>>;
    nextRecurAt: z.ZodOptional<z.ZodString>;
    isRecurringInstance: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type TaskFrontmatter = z.infer<typeof TaskFrontmatterSchema>;
/**
 * NOTE: Internally this is called "Task", but in the UI and Domain Language,
 * this represents a "Story" (the main card on the Kanban board).
 * The sub-checklists inside the body are the actual "Tasks".
 */
export interface Task {
    frontmatter: TaskFrontmatter;
    body: string;
    filePath: string;
}
export declare const CreateTaskInputSchema: z.ZodObject<{
    title: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<{
        blocked: "blocked";
        done: "done";
        "in-progress": "in-progress";
        review: "review";
        todo: "todo";
    }>>;
    assignee: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
        urgent: "urgent";
    }>>;
    dueDate: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    epic: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodString>;
    isTemplate: z.ZodOptional<z.ZodBoolean>;
    recurrence: z.ZodOptional<z.ZodEnum<{
        daily: "daily";
        weekly: "weekly";
    }>>;
    nextRecurAt: z.ZodOptional<z.ZodString>;
    isRecurringInstance: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export declare const UpdateTaskInputSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        blocked: "blocked";
        done: "done";
        "in-progress": "in-progress";
        review: "review";
        todo: "todo";
    }>>;
    assignee: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priority: z.ZodOptional<z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
        urgent: "urgent";
    }>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    epic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    body: z.ZodOptional<z.ZodString>;
    isTemplate: z.ZodOptional<z.ZodBoolean>;
    recurrence: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        daily: "daily";
        weekly: "weekly";
    }>>>;
    nextRecurAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export declare const KanbanMetaSchema: z.ZodObject<{
    lastId: z.ZodNumber;
    columns: z.ZodArray<z.ZodEnum<{
        blocked: "blocked";
        done: "done";
        "in-progress": "in-progress";
        review: "review";
        todo: "todo";
    }>>;
    columnLabels: z.ZodRecord<z.ZodEnum<{
        blocked: "blocked";
        done: "done";
        "in-progress": "in-progress";
        review: "review";
        todo: "todo";
    }>, z.ZodString>;
}, z.core.$strip>;
export type KanbanMeta = z.infer<typeof KanbanMetaSchema>;
export interface BoardState {
    columns: {
        id: TaskStatus;
        label: string;
        tasks: TaskFrontmatter[];
    }[];
    templates: TaskFrontmatter[];
    totalTasks: number;
    lastSync: string;
}
//# sourceMappingURL=schema.d.ts.map