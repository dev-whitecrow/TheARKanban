import React, { useEffect, useState } from 'react';
import type { TaskDetail, TaskPriority, TaskStatus } from './types';
import { fetchTaskDetail, updateTask, deleteTask } from './api';
import { useSSE } from './useSSE';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onUpdated: () => void;
  uniqueAssignees: string[];
}

const STATUS_EMOJI: Record<string, string> = {
  'todo': '📋',
  'in-progress': '🔨',
  'review': '👀',
  'done': '✅',
  'blocked': '🚫',
};

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

import AssigneeSelect from './AssigneeSelect';

export default function TaskDetailModal({ taskId, onClose, onUpdated, uniqueAssignees }: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editBody, setEditBody] = useState('');

  const loadTask = () => {
    fetchTaskDetail(taskId)
      .then((t) => {
        setTask(t);
        setEditTitle(t.title);
        setEditAssignee(t.assignee ?? '');
        setEditPriority(t.priority);
        setEditStatus(t.status);
        setEditDueDate(t.dueDate ?? '');
        setEditTags(t.tags.join(', '));
        setEditBody(t.body);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  useSSE(() => {
    if (!editing) {
      loadTask();
    }
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
          setEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, editing]);

  const handleSave = async () => {
    if (!task || !editTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateTask(task.id, {
        title: editTitle.trim(),
        assignee: editAssignee.trim() || null,
        priority: editPriority,
        status: editStatus,
        dueDate: editDueDate || null,
        tags: editTags ? editTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        body: editBody,
      });
      setEditing(false);
      onUpdated();
      // Refetch to show updated data
      const updated = await fetchTaskDetail(taskId);
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await deleteTask(task.id);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setSaving(false);
    }
  };

  const handleMarkdownClick = async (e: React.MouseEvent) => {
    if (!task) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      e.preventDefault();
      
      const allCheckboxes = Array.from(document.querySelectorAll('.markdown-body input[type="checkbox"]'));
      const index = allCheckboxes.indexOf(target as HTMLInputElement);
      if (index === -1) return;

      let count = -1;
      const newBody = task.body.replace(/- \[[ xX]\]/g, (match) => {
        count++;
        if (count === index) {
          return match === '- [ ]' ? '- [x]' : '- [ ]';
        }
        return match;
      });

      // Optimistic UI update
      setTask({ ...task, body: newBody });
      try {
        await updateTask(task.id, { body: newBody });
        onUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle checkbox');
        setTask(task); // Revert
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {error && !task ? (
          <div className="empty-state">
            <div className="icon">❌</div>
            <div>{error}</div>
          </div>
        ) : !task ? (
          <div className="empty-state">
            <div className="loading-spinner" />
          </div>
        ) : editing ? (
          /* ─── Edit Mode ─── */
          <>
            <div className="modal-header">
              <div>
                <div className="modal-id">{task.id}</div>
                <h2 className="modal-title">Edit Story</h2>
              </div>
              <button className="modal-close" onClick={() => setEditing(false)}>✕</button>
            </div>

            <div className="create-form">
              <div className="form-field">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input form-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  >
                    <option value="todo">📋 Todo</option>
                    <option value="in-progress">🔨 In Progress</option>
                    <option value="review">👀 Review</option>
                    <option value="done">✅ Done</option>
                    <option value="blocked">🚫 Blocked</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input form-select"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Assignee</label>
                  <AssigneeSelect
                    value={editAssignee}
                    onChange={setEditAssignee}
                    options={uniqueAssignees}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Due Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Epic</label>
                <input
                  className="form-input"
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="comma, separated"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Tasks</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 120, fontFamily: 'var(--font-mono)' }}
                  value={editBody || ''}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Add notes, checklists, etc."
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                >
                  🗑️ Delete
                </button>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!editTitle.trim() || saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {confirmDelete && (
              <div className="confirm-overlay">
                <div className="confirm-box">
                  <p>Delete <strong>{task.id}</strong>?</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    This will permanently remove the Markdown file.
                  </p>
                  <div className="form-actions" style={{ marginTop: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-danger" onClick={handleDelete}>
                      Yes, Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ─── View Mode ─── */
          <>
            <div className="modal-header">
              <div>
                <div className="modal-id">{task.id}</div>
                <h2 className="modal-title">{task.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-icon" title="Edit" onClick={() => setEditing(true)}>✏️</button>
                <button className="modal-close" onClick={onClose}>✕</button>
              </div>
            </div>

            <div className="modal-fields">
              <div className="modal-field">
                <span className="modal-field-label">Status</span>
                <span className={`status-badge ${task.status}`}>
                  {STATUS_EMOJI[task.status]} {task.status}
                </span>
              </div>
              <div className="modal-field">
                <span className="modal-field-label">Priority</span>
                <span className="modal-field-value">
                  {PRIORITY_EMOJI[task.priority]} {task.priority}
                </span>
              </div>
              <div className="modal-field">
                <span className="modal-field-label">Assignee</span>
                <span className="modal-field-value">
                  {task.assignee ?? '—'}
                </span>
              </div>
              <div className="modal-field">
                <span className="modal-field-label">Due Date</span>
                <span className="modal-field-value">
                  {task.dueDate ?? '—'}
                </span>
              </div>
            </div>

            {task.tags.length > 0 && (
              <div className="task-card-tags" style={{ marginBottom: 12 }}>
                {task.tags.map((tag) => (
                  <span key={tag} className="task-tag">{tag}</span>
                ))}
              </div>
            )}

            <div className="modal-body markdown-body" onClick={handleMarkdownClick}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  input: ({node, disabled, ...props}) => {
                    if (props.type === 'checkbox') {
                      return <input {...props} disabled={false} style={{ cursor: 'pointer' }} />;
                    }
                    return <input {...props} disabled={disabled} />;
                  }
                }}
              >
                {task.body || 'No notes yet.'}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
