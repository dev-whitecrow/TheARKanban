import React, { useState, useEffect } from 'react';
import type { TaskStatus, TaskPriority } from './types';
import { createTaskApi } from './api';
import AssigneeSelect from './AssigneeSelect';

interface CreateTaskModalProps {
  initialStatus: TaskStatus;
  onClose: () => void;
  onCreated: () => void;
  uniqueAssignees: string[];
}

export default function CreateTaskModal({ initialStatus, onClose, onCreated, uniqueAssignees }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await createTaskApi({
        title: title.trim(),
        status: initialStatus,
        assignee: assignee.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        body: body || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-id">New Story</div>
            <h2 className="modal-title">Create Story</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-field">
            <label className="form-label">Story Title *</label>
            <input
              className="form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Assignee</label>
              <AssigneeSelect
                value={assignee}
                onChange={setAssignee}
                options={uniqueAssignees}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Priority</label>
              <select
                className="form-input form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
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
              <label className="form-label">Due Date</label>
              <input
                className="form-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Epic</label>
              <input
                className="form-input"
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="comma, separated epics"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Tasks</label>
            <textarea
              className="form-input"
              style={{ minHeight: 120, fontFamily: 'var(--font-mono)' }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add checklists (- [ ]), notes, etc."
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim() || saving}>
              {saving ? 'Creating…' : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
