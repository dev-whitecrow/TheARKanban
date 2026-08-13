import { z } from 'zod';
// ─── Status Enum ───────────────────────────────────────────────
export const TaskStatus = z.enum([
    'todo',
    'in-progress',
    'review',
    'done',
    'blocked',
]);
// ─── Priority Enum ─────────────────────────────────────────────
export const TaskPriority = z.enum(['low', 'medium', 'high', 'urgent']);
// ─── Status Transition Rules ───────────────────────────────────
// Defines which status transitions are allowed.
// "blocked" can be entered from any status and can return to any status.
export const ALLOWED_TRANSITIONS = {
    'todo': ['in-progress', 'blocked'],
    'in-progress': ['review', 'done', 'blocked', 'todo'],
    'review': ['in-progress', 'done', 'blocked'],
    'done': ['todo', 'in-progress'], // reopen allowed
    'blocked': ['todo', 'in-progress', 'review'], // unblock to any active state
};
export function isValidTransition(from, to) {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
// ─── Task Frontmatter Schema ───────────────────────────────────
export const TaskFrontmatterSchema = z.object({
    id: z.string().regex(/^STORY-\d+$/, 'ID must be in STORY-NNN format'),
    title: z.string().min(1, 'Title is required'),
    status: TaskStatus.default('todo'),
    assignee: z.string().optional(),
    priority: TaskPriority.default('medium'),
    dueDate: z.string().optional(), // ISO date string
    tags: z.array(z.string()).default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
});
// ─── Create Task Input (for API/CLI/Discord) ───────────────────
export const CreateTaskInputSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    status: TaskStatus.optional(),
    assignee: z.string().optional(),
    priority: TaskPriority.optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    body: z.string().optional(),
});
// ─── Update Task Input ─────────────────────────────────────────
export const UpdateTaskInputSchema = z.object({
    title: z.string().min(1).optional(),
    status: TaskStatus.optional(),
    assignee: z.string().nullable().optional(), // null to unassign
    priority: TaskPriority.optional(),
    dueDate: z.string().nullable().optional(), // null to clear
    tags: z.array(z.string()).optional(),
    body: z.string().optional(),
});
// ─── Kanban Meta Schema ────────────────────────────────────────
export const KanbanMetaSchema = z.object({
    lastId: z.number().int().min(0),
    columns: z.array(TaskStatus),
    columnLabels: z.record(TaskStatus, z.string()),
});
//# sourceMappingURL=schema.js.map