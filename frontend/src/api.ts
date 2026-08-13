import type { BoardState, TaskDetail } from './types';

const BASE = '';  // Uses Vite proxy

export async function fetchBoard(): Promise<BoardState> {
  const res = await fetch(`${BASE}/api/board`);
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.statusText}`);
  return res.json();
}

export async function fetchTaskDetail(id: string): Promise<TaskDetail> {
  const res = await fetch(`${BASE}/api/tasks/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.statusText}`);
  return res.json();
}

export async function moveTask(id: string, status: string): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks/${id}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to move task');
  }
}

export async function updateTask(id: string, updates: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update task');
  }
}

export async function createTaskApi(input: {
  title: string;
  status?: string;
  assignee?: string;
  priority?: string;
  dueDate?: string;
  tags?: string[];
  body?: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create task');
  }
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete task');
  }
}
