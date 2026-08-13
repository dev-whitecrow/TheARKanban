import { Router, type Request, type Response } from 'express';
import { consola } from 'consola';
import {
  getTask,
  getAllTasks,
  getBoardState,
  getHealthInfo,
} from '../state-manager.js';
import {
  createTask,
  updateTask,
  moveTask,
  addNote,
  removeTask,
} from '../write-queue.js';
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  TaskStatus,
} from '../schema.js';

export function createApiRouter(): Router {
  const router = Router();

  /**
   * NOTE ON DOMAIN LANGUAGE:
   * The API endpoints and internal variable names use "task" (e.g., /api/tasks, getTask).
   * However, in the User Interface and Domain Language, these represent a "Story"
   * (the main cards on the Kanban board).
   * The internal checklist items within a Story are referred to as "Tasks".
   */

  // ─── GET /api/tasks ────────────────────────────────────────
  // List all tasks, optionally filtered by status or assignee
  router.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      let tasks = getAllTasks();

      const { status, assignee } = req.query;
      if (status && typeof status === 'string') {
        const parsed = TaskStatus.safeParse(status);
        if (parsed.success) {
          tasks = tasks.filter((t) => t.frontmatter.status === parsed.data);
        }
      }
      if (assignee && typeof assignee === 'string') {
        tasks = tasks.filter((t) => t.frontmatter.assignee === assignee);
      }

      res.json({
        tasks: tasks.map((t) => t.frontmatter),
        total: tasks.length,
      });
    } catch (err) {
      consola.error('GET /api/tasks failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/tasks/:id ────────────────────────────────────
  router.get('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const task = getTask(req.params.id as string);
      if (!task) {
        res.status(404).json({ error: `Task ${req.params.id as string} not found` });
        return;
      }
      res.json({ ...task.frontmatter, body: task.body });
    } catch (err) {
      consola.error(`GET /api/tasks/${req.params.id as string} failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/tasks ───────────────────────────────────────
  router.post('/api/tasks', async (req: Request, res: Response) => {
    try {
      const parsed = CreateTaskInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
        return;
      }

      const task = await createTask(parsed.data, 'api');
      res.status(201).json(task.frontmatter);
    } catch (err) {
      consola.error('POST /api/tasks failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── PUT /api/tasks/:id ────────────────────────────────────
  router.put('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const existing = getTask(req.params.id as string);
      if (!existing) {
        res.status(404).json({ error: `Task ${req.params.id as string} not found` });
        return;
      }

      const parsed = UpdateTaskInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
        return;
      }

      const updated = await updateTask(existing, parsed.data, 'api');
      res.json(updated.frontmatter);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Invalid status transition') ? 400 : 500;
      consola.error(`PUT /api/tasks/${req.params.id as string} failed:`, err);
      res.status(status).json({ error: message });
    }
  });

  // ─── PUT /api/tasks/:id/move ───────────────────────────────
  router.put('/api/tasks/:id/move', async (req: Request, res: Response) => {
    try {
      const existing = getTask(req.params.id as string);
      if (!existing) {
        res.status(404).json({ error: `Task ${req.params.id as string} not found` });
        return;
      }

      const statusParsed = TaskStatus.safeParse(req.body.status);
      if (!statusParsed.success) {
        res.status(400).json({ error: 'Invalid status', validStatuses: TaskStatus.options });
        return;
      }

      const updated = await moveTask(existing, statusParsed.data, 'api');
      res.json(updated.frontmatter);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Invalid status transition') ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  // ─── POST /api/tasks/:id/note ──────────────────────────────
  router.post('/api/tasks/:id/note', async (req: Request, res: Response) => {
    try {
      const existing = getTask(req.params.id as string);
      if (!existing) {
        res.status(404).json({ error: `Task ${req.params.id as string} not found` });
        return;
      }

      const { note, author } = req.body;
      if (!note || !author) {
        res.status(400).json({ error: 'Both "note" and "author" are required' });
        return;
      }

      const updated = await addNote(existing, note, author, 'api');
      res.json(updated.frontmatter);
    } catch (err) {
      consola.error(`POST /api/tasks/${req.params.id as string}/note failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── DELETE /api/tasks/:id ─────────────────────────────────
  router.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const existing = getTask(req.params.id as string);
      if (!existing) {
        res.status(404).json({ error: `Task ${req.params.id as string} not found` });
        return;
      }

      await removeTask(existing, 'api');
      res.json({ deleted: req.params.id as string });
    } catch (err) {
      consola.error(`DELETE /api/tasks/${req.params.id as string} failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/board ────────────────────────────────────────
  router.get('/api/board', async (_req: Request, res: Response) => {
    try {
      const board = await getBoardState();
      res.json(board);
    } catch (err) {
      consola.error('GET /api/board failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /health ───────────────────────────────────────────
  router.get('/health', (_req: Request, res: Response) => {
    res.json(getHealthInfo());
  });

  return router;
}
