import React from 'react';
import type { TaskFrontmatter } from './types';
import TaskCard from './TaskCard';

interface Props {
  templates: TaskFrontmatter[];
  onClose: () => void;
  onCardClick: (taskId: string) => void;
}

export const RecurringTemplatesModal: React.FC<Props> = ({ templates, onClose, onCardClick }) => {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 90 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--priority-high)' }}>🔄</span> Recurring Templates
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Hidden templates that automatically generate tasks on their scheduled intervals.
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
          {templates.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔄</div>
              <div>No recurring templates configured.</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>To create one, edit any task and set its Recurrence schedule.</div>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '16px' 
            }}>
              {templates.map(task => (
                <TaskCard 
                  key={task.id}
                  task={task}
                  onClick={() => onCardClick(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
