import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTask } from '../write-queue.js';
import { initStateManager, getAllTasks, getTask } from '../state-manager.js';
import type { CreateTaskInput } from '../schema.js';

const TASKS_DIR = path.join(process.cwd(), 'data', 'tasks');
const META_FILE = path.join(process.cwd(), '.kanban-meta.json');

// Backup original meta
let originalMeta: string;

beforeAll(async () => {
  originalMeta = await fs.readFile(META_FILE, 'utf-8');
});

afterAll(async () => {
  // Restore meta
  await fs.writeFile(META_FILE, originalMeta, 'utf-8');

  // Clean up test task files
  const files = await fs.readdir(TASKS_DIR);
  for (const file of files) {
    if (file.endsWith('.md')) {
      await fs.unlink(path.join(TASKS_DIR, file));
    }
  }
});

beforeEach(async () => {
  // Reset meta to 0 before each test
  await fs.writeFile(META_FILE, JSON.stringify({
    lastId: 0,
    columns: ['todo', 'in-progress', 'review', 'done', 'blocked'],
    columnLabels: {
      'todo': '📋 To Do',
      'in-progress': '🔨 In Progress',
      'review': '👀 Review',
      'done': '✅ Done',
      'blocked': '🚫 Blocked',
    },
  }, null, 2), 'utf-8');

  // Clean existing task files
  const files = await fs.readdir(TASKS_DIR);
  for (const file of files) {
    if (file.endsWith('.md')) {
      await fs.unlink(path.join(TASKS_DIR, file));
    }
  }
});

describe('Write Queue — Concurrency', () => {
  it('should handle 10 concurrent writes without data loss', async () => {
    // Initialize state manager
    await initStateManager();

    // Fire 10 concurrent createTask calls
    const inputs: CreateTaskInput[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Concurrent Task ${i + 1}`,
      priority: 'medium' as const,
      assignee: `Agent-${i}`,
    }));

    const results = await Promise.all(
      inputs.map((input) => createTask(input, 'test')),
    );

    // All 10 should succeed
    expect(results).toHaveLength(10);

    // All IDs should be unique
    const ids = results.map((r) => r.frontmatter.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);

    // IDs should be sequential: TASK-001 through TASK-010
    const sortedIds = ids.sort();
    expect(sortedIds[0]).toBe('TASK-001');
    expect(sortedIds[9]).toBe('TASK-010');

    // Verify all files exist on disk
    for (const task of results) {
      const exists = await fs.access(task.filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }

    // Verify file content matches frontmatter
    for (const task of results) {
      const content = await fs.readFile(task.filePath, 'utf-8');
      expect(content).toContain(`id: ${task.frontmatter.id}`);
      expect(content).toContain(`title: ${task.frontmatter.title}`);
    }
  });

  it('should produce valid task files with correct frontmatter', async () => {
    await initStateManager();

    const task = await createTask({
      title: 'Schema Validation Test',
      priority: 'high',
      assignee: 'Hermes',
      tags: ['test', 'validation'],
      dueDate: '2026-08-20',
    }, 'test');

    expect(task.frontmatter.id).toMatch(/^TASK-\d+$/);
    expect(task.frontmatter.title).toBe('Schema Validation Test');
    expect(task.frontmatter.status).toBe('todo');
    expect(task.frontmatter.priority).toBe('high');
    expect(task.frontmatter.assignee).toBe('Hermes');
    expect(task.frontmatter.tags).toEqual(['test', 'validation']);
    expect(task.frontmatter.dueDate).toBe('2026-08-20');
    expect(task.frontmatter.createdAt).toBeTruthy();
    expect(task.frontmatter.updatedAt).toBeTruthy();

    // Body should contain Activity Log
    expect(task.body).toContain('## Activity Log');
    expect(task.body).toContain('Created by Hermes');
  });
});
