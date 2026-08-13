import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskFrontmatter } from './types';

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

interface TaskCardProps {
  task: TaskFrontmatter;
  onClick: (id: string) => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={() => onClick(task.id)}
      {...attributes}
      {...listeners}
    >
      <div className="task-card-id">
        <span className={`priority-dot ${task.priority}`} />
        {task.id}
      </div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        {task.assignee ? (
          <div className="task-card-assignee">
            <span className="avatar">{task.assignee[0]}</span>
            <span>{task.assignee}</span>
          </div>
        ) : (
          <span />
        )}
        <span className="task-card-due">
          {task.dueDate ?? ''}
        </span>
      </div>
      {task.tags.length > 0 && (
        <div className="task-card-tags" style={{ marginTop: 6 }}>
          {task.tags.map((tag) => (
            <span key={tag} className="task-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Overlay version used during drag
export function TaskCardOverlay({ task }: { task: TaskFrontmatter }) {
  return (
    <div className="task-card drag-overlay">
      <div className="task-card-id">
        <span className={`priority-dot ${task.priority}`} />
        {task.id}
      </div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        {task.assignee ? (
          <div className="task-card-assignee">
            <span className="avatar">{task.assignee[0]}</span>
            <span>{task.assignee}</span>
          </div>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
