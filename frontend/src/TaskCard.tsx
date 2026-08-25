import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskFrontmatter } from './types';
import { stringToColor } from './utils';

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

  const assigneeBgColor = task.assignee ? stringToColor(task.assignee, 70, 50, 0.04) : undefined;
  const assigneeBorderColor = task.assignee ? stringToColor(task.assignee, 70, 50, 0.15) : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(assigneeBgColor ? { backgroundColor: assigneeBgColor, borderColor: assigneeBorderColor } : {})
  };

  // Apply orange border if it's a generated recurring instance
  const cardStyle = task.isRecurringInstance 
    ? { border: '1px solid var(--priority-high)' } 
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...cardStyle,
      }}
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
        {task.epic && (
          <span 
            className="epic-badge"
            style={{
              borderColor: stringToColor(task.epic, 70, 60, 1),
              color: stringToColor(task.epic, 70, 75, 1)
            }}
          >
            {task.epic}
          </span>
        )}
        {task.assignee ? (
          <div className="task-card-assignee">
            <span 
              className="avatar"
              style={{ backgroundColor: stringToColor(task.assignee, 70, 50, 1) }}
            >
              {task.assignee[0].toUpperCase()}
            </span>
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
  const cardStyle = task.isRecurringInstance 
    ? { border: '1px solid var(--priority-high)' } 
    : undefined;

  return (
    <div className="task-card drag-overlay" style={cardStyle}>
      <div className="task-card-id">
        <span className={`priority-dot ${task.priority}`} />
        {task.id}
      </div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        {task.epic && (
          <span 
            className="epic-badge"
            style={{
              borderColor: stringToColor(task.epic, 70, 60, 1),
              color: stringToColor(task.epic, 70, 75, 1)
            }}
          >
            {task.epic}
          </span>
        )}
        {task.assignee ? (
          <div className="task-card-assignee">
            <span 
              className="avatar"
              style={{ backgroundColor: stringToColor(task.assignee, 70, 50, 1) }}
            >
              {task.assignee[0].toUpperCase()}
            </span>
            <span>{task.assignee}</span>
          </div>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
