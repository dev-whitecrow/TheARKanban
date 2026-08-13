import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { glob } from 'glob';
import { consola } from 'consola';
import { TaskFrontmatterSchema, KanbanMetaSchema, } from './schema.js';
// ─── Paths ─────────────────────────────────────────────────────
const ROOT_DIR = process.cwd();
const TASKS_DIR = path.join(ROOT_DIR, 'data', 'tasks');
const META_FILE = path.join(ROOT_DIR, '.kanban-meta.json');
export function getTasksDir() {
    return TASKS_DIR;
}
// ─── Kanban Meta ───────────────────────────────────────────────
export async function readMeta() {
    try {
        const raw = await fs.readFile(META_FILE, 'utf-8');
        return KanbanMetaSchema.parse(JSON.parse(raw));
    }
    catch {
        consola.warn('Could not read .kanban-meta.json, using defaults');
        return {
            lastId: 0,
            columns: ['todo', 'in-progress', 'review', 'done', 'blocked'],
            columnLabels: {
                'todo': '📋 To Do',
                'in-progress': '🔨 In Progress',
                'review': '👀 Review',
                'done': '✅ Done',
                'blocked': '🚫 Blocked',
            },
        };
    }
}
export async function writeMeta(meta) {
    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
}
export async function getNextId() {
    const meta = await readMeta();
    meta.lastId += 1;
    await writeMeta(meta);
    const padded = String(meta.lastId).padStart(3, '0');
    return `STORY-${padded}`;
}
// ─── Task File I/O ─────────────────────────────────────────────
/**
 * Parse a single .md task file into a Task object.
 * Returns null if file is invalid (graceful degradation).
 */
export async function parseTaskFile(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const { data, content } = matter(raw);
        const parsed = TaskFrontmatterSchema.safeParse(data);
        if (!parsed.success) {
            consola.warn(`Invalid frontmatter in ${path.basename(filePath)}:`, parsed.error.issues);
            return null;
        }
        return {
            frontmatter: parsed.data,
            body: content.trim(),
            filePath,
        };
    }
    catch (err) {
        consola.error(`Failed to read ${filePath}:`, err);
        return null;
    }
}
/**
 * Write a Task object to a .md file.
 * Creates the file if it doesn't exist.
 */
export async function writeTaskFile(task) {
    // Build the frontmatter object (strip undefined values)
    const fm = {};
    for (const [key, value] of Object.entries(task.frontmatter)) {
        if (value !== undefined) {
            fm[key] = value;
        }
    }
    const fileContent = matter.stringify(task.body ? `\n${task.body}\n` : '\n', fm);
    await fs.mkdir(path.dirname(task.filePath), { recursive: true });
    await fs.writeFile(task.filePath, fileContent, 'utf-8');
}
/**
 * Delete a task file.
 */
export async function deleteTaskFile(filePath) {
    await fs.unlink(filePath);
}
/**
 * Build a Task object from CreateTaskInput + generated ID.
 */
export function buildNewTask(id, input) {
    const now = new Date().toISOString();
    const frontmatter = {
        id,
        title: input.title,
        status: input.status ?? 'todo',
        assignee: input.assignee,
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate,
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
    };
    const activityEntry = `- [${now.slice(0, 16).replace('T', ' ')}] Created${input.assignee ? ` by ${input.assignee}` : ''}`;
    const body = input.body
        ? `## Notes\n${input.body}\n\n## Activity Log\n${activityEntry}`
        : `## Notes\n\n## Activity Log\n${activityEntry}`;
    const filePath = path.join(TASKS_DIR, `${id}.md`);
    return { frontmatter, body, filePath };
}
/**
 * Scan all task files from the tasks directory.
 * Used for initial boot-up state building.
 */
export async function scanAllTasks() {
    await fs.mkdir(TASKS_DIR, { recursive: true });
    const files = await glob('*.md', { cwd: TASKS_DIR, absolute: true });
    const tasks = [];
    for (const file of files) {
        const task = await parseTaskFile(file);
        if (task) {
            tasks.push(task);
        }
    }
    consola.info(`Scanned ${tasks.length} task(s) from ${TASKS_DIR}`);
    return tasks;
}
//# sourceMappingURL=file-manager.js.map