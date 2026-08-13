import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { consola } from 'consola';
import { initStateManager, getTask, getAllTasks, getBoardState } from '../state-manager.js';
import { createTask, updateTask, moveTask, addNote } from '../write-queue.js';
import { isValidTransition, ALLOWED_TRANSITIONS } from '../schema.js';
async function main() {
    // Initialize state manager first
    await initStateManager();
    const server = new McpServer({
        name: 'mndk-kanban',
        version: '0.1.0',
    });
    // ─── Tool: get_board_state ───────────────────────────────────
    server.tool('get_board_state', 'Get the full Kanban board state, grouped by columns with task counts.', {}, async () => {
        const board = await getBoardState();
        return {
            content: [{ type: 'text', text: JSON.stringify(board, null, 2) }],
        };
    });
    // ─── Tool: get_task ──────────────────────────────────────────
    server.tool('get_task', 'Get detailed information about a specific task by ID.', { id: z.string().describe('Task ID (e.g., TASK-001)') }, async ({ id }) => {
        const task = getTask(id);
        if (!task) {
            return {
                content: [{ type: 'text', text: `Error: Task ${id} not found.` }],
                isError: true,
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        ...task.frontmatter,
                        body: task.body,
                    }, null, 2),
                }],
        };
    });
    // ─── Tool: list_tasks ────────────────────────────────────────
    server.tool('list_tasks', 'List tasks with optional filtering by status and/or assignee.', {
        status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']).optional()
            .describe('Filter by status'),
        assignee: z.string().optional().describe('Filter by assignee name'),
    }, async ({ status, assignee }) => {
        let tasks = getAllTasks();
        if (status)
            tasks = tasks.filter((t) => t.frontmatter.status === status);
        if (assignee)
            tasks = tasks.filter((t) => t.frontmatter.assignee === assignee);
        const result = tasks.map((t) => t.frontmatter);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ tasks: result, total: result.length }, null, 2),
                }],
        };
    });
    // ─── Tool: create_task ───────────────────────────────────────
    server.tool('create_task', 'Create a new task on the Kanban board.', {
        title: z.string().describe('Task title (required)'),
        assignee: z.string().optional().describe('Person or AI agent responsible'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
            .describe('Task priority (default: medium)'),
        status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']).optional()
            .describe('Initial status (default: todo)'),
        dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
        body: z.string().optional().describe('Additional notes or context'),
    }, async (input) => {
        try {
            const task = await createTask(input, 'mcp');
            return {
                content: [{
                        type: 'text',
                        text: `✅ Created ${task.frontmatter.id}: "${task.frontmatter.title}"\n${JSON.stringify(task.frontmatter, null, 2)}`,
                    }],
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }],
                isError: true,
            };
        }
    });
    // ─── Tool: update_task ───────────────────────────────────────
    server.tool('update_task', 'Update an existing task. Only provide fields you want to change.', {
        id: z.string().describe('Task ID to update (e.g., TASK-001)'),
        title: z.string().optional().describe('New title'),
        status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']).optional()
            .describe('New status (must be a valid transition)'),
        assignee: z.string().nullable().optional()
            .describe('New assignee (null to unassign)'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
            .describe('New priority'),
        dueDate: z.string().nullable().optional()
            .describe('New due date (null to clear)'),
        tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
    }, async ({ id, ...updates }) => {
        const existing = getTask(id);
        if (!existing) {
            return {
                content: [{ type: 'text', text: `Error: Task ${id} not found.` }],
                isError: true,
            };
        }
        try {
            const updated = await updateTask(existing, updates, 'mcp');
            return {
                content: [{
                        type: 'text',
                        text: `✅ Updated ${updated.frontmatter.id}\n${JSON.stringify(updated.frontmatter, null, 2)}`,
                    }],
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }],
                isError: true,
            };
        }
    });
    // ─── Tool: move_task ─────────────────────────────────────────
    server.tool('move_task', 'Move a task to a new status column. Validates allowed transitions.', {
        id: z.string().describe('Task ID to move'),
        status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked'])
            .describe('Target status column'),
    }, async ({ id, status }) => {
        const existing = getTask(id);
        if (!existing) {
            return {
                content: [{ type: 'text', text: `Error: Task ${id} not found.` }],
                isError: true,
            };
        }
        // Provide helpful error with allowed transitions
        if (!isValidTransition(existing.frontmatter.status, status)) {
            const allowed = ALLOWED_TRANSITIONS[existing.frontmatter.status];
            return {
                content: [{
                        type: 'text',
                        text: `Error: Cannot move from "${existing.frontmatter.status}" to "${status}". Allowed: ${allowed.join(', ')}`,
                    }],
                isError: true,
            };
        }
        try {
            const updated = await moveTask(existing, status, 'mcp');
            return {
                content: [{
                        type: 'text',
                        text: `✅ Moved ${updated.frontmatter.id} to "${status}"\n${JSON.stringify(updated.frontmatter, null, 2)}`,
                    }],
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }],
                isError: true,
            };
        }
    });
    // ─── Tool: add_note ──────────────────────────────────────────
    server.tool('add_note', 'Add a note to a task\'s Activity Log. Use this to record progress, decisions, or observations.', {
        id: z.string().describe('Task ID'),
        note: z.string().describe('The note content to add'),
        author: z.string().describe('Who is adding the note (e.g., "Hermes")'),
    }, async ({ id, note, author }) => {
        const existing = getTask(id);
        if (!existing) {
            return {
                content: [{ type: 'text', text: `Error: Task ${id} not found.` }],
                isError: true,
            };
        }
        try {
            const updated = await addNote(existing, note, author, 'mcp');
            return {
                content: [{
                        type: 'text',
                        text: `✅ Note added to ${updated.frontmatter.id} by ${author}`,
                    }],
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }],
                isError: true,
            };
        }
    });
    // ─── Connect via stdio ───────────────────────────────────────
    const transport = new StdioServerTransport();
    await server.connect(transport);
    consola.info('MCP server connected via stdio');
}
main().catch((err) => {
    consola.fatal('MCP server failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map