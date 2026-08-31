// ─── Types matching backend schema ─────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskFrontmatter {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  epic?: string;
  createdAt: string;
  updatedAt: string;
  isTemplate?: boolean;
  recurrence?: 'daily' | 'weekly';
  nextRecurAt?: string;
  isRecurringInstance?: boolean;
}

export interface TaskDetail extends TaskFrontmatter {
  body: string;
}

export interface Column {
  id: TaskStatus;
  label: string;
  tasks: TaskFrontmatter[];
}

export interface BoardState {
  columns: {
    id: string;
    label: string;
    tasks: TaskFrontmatter[];
  }[];
  templates: TaskFrontmatter[];
  totalTasks: number;
  lastSync: string;
}
