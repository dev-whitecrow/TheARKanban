import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard, { TaskCardOverlay } from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import { RecurringTemplatesModal } from './RecurringTemplatesModal';
import { useSSE } from './useSSE';
import { fetchBoard, moveTask } from './api';
import type { BoardState, TaskFrontmatter, TaskStatus, Column } from './types';

// ─── Droppable Column Component ────────────────────────────────
function DroppableColumn({
  id,
  label,
  tasks,
  onCardClick,
  onAddClick,
}: {
  id: string;
  label: string;
  tasks: TaskFrontmatter[];
  onCardClick: (id: string) => void;
  onAddClick: (columnId: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`column ${isOver ? 'drag-over' : ''}`}>
      <div className="column-header">
        <span className="column-title">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="column-count">{tasks.length}</span>
          <button
            className="btn-add"
            title={`Add story to ${label}`}
            onClick={() => onAddClick(id as TaskStatus)}
          >
            +
          </button>
        </div>
      </div>
      <div className="column-tasks" ref={setNodeRef}>
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <div>No stories</div>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onCardClick} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────
export default function App() {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskFrontmatter | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createForColumn, setCreateForColumn] = useState<TaskStatus | null>(null);
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());
  const [showEpicFilter, setShowEpicFilter] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);


  const uniqueAssignees = React.useMemo(() => {
    if (!board) return [];
    const assignees = new Set<string>();
    board.columns.forEach(col => {
      col.tasks.forEach(t => {
        if (t.assignee) assignees.add(t.assignee);
      });
    });
    return Array.from(assignees).sort();
  }, [board]);

  const uniqueEpics = React.useMemo(() => {
    if (!board) return [];
    const epics = new Set<string>();
    board.columns.forEach(col => {
      col.tasks.forEach(t => {
        if (t.epic) epics.add(t.epic);
      });
    });
    return Array.from(epics).sort();
  }, [board]);

  // Load initial board state
  const loadBoard = useCallback(async () => {
    try {
      const data = await fetchBoard();
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // SSE — reload board on any task event
  const { connected } = useSSE(
    useCallback(() => {
      loadBoard();
    }, [loadBoard]),
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as TaskFrontmatter | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over || !board) return;

    const taskId = active.id as string;
    const task = active.data.current?.task as TaskFrontmatter | undefined;
    if (!task) return;

    // Determine target column
    let targetColumnId: string | null = null;

    const isColumn = board.columns.some((c) => c.id === over.id);
    if (isColumn) {
      targetColumnId = over.id as string;
    } else {
      for (const col of board.columns) {
        if (col.tasks.some((t) => t.id === over.id)) {
          targetColumnId = col.id;
          break;
        }
      }
    }

    if (!targetColumnId || targetColumnId === task.status) return;

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      const updatedColumns = prev.columns.map((col) => {
        if (col.id === task.status) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        }
        if (col.id === targetColumnId) {
          const movedTask = { ...task, status: targetColumnId as TaskStatus };
          return { ...col, tasks: [...col.tasks, movedTask] };
        }
        return col;
      });
      return { ...prev, columns: updatedColumns };
    });

    // Send to server
    try {
      await moveTask(taskId, targetColumnId);
    } catch {
      loadBoard();
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading board…</div>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="loading">
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{error}</div>
        <button
          onClick={loadBoard}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            background: 'var(--accent-indigo)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <span className="logo">🌌</span>
          <span>MNDK</span>
        </div>
        <div className="header-stats">
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowRecurringModal(true)}
          >
            <span style={{ color: 'var(--priority-high)' }}>🔄</span> Recurring
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowEpicFilter(!showEpicFilter)}
            >
              Filter Epic {selectedEpics.size > 0 && `(${selectedEpics.size})`}
            </button>
            {showEpicFilter && (
              <div className="assignee-dropdown" style={{ right: 0, left: 'auto', minWidth: 200, padding: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, padding: '0 4px', fontWeight: 600, textTransform: 'uppercase' }}>Select Epics</div>
                {uniqueEpics.length === 0 ? (
                  <div className="assignee-option empty">No epics</div>
                ) : (
                  uniqueEpics.map(epic => (
                    <label key={epic} className="assignee-option" style={{ display: 'flex', gap: '8px', cursor: 'pointer', padding: '4px 8px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedEpics.has(epic)}
                        onChange={(e) => {
                          const next = new Set(selectedEpics);
                          if (e.target.checked) next.add(epic);
                          else next.delete(epic);
                          setSelectedEpics(next);
                        }}
                      />
                      {epic}
                    </label>
                  ))
                )}
                {selectedEpics.size > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: 8, padding: '4px', fontSize: 11 }}
                    onClick={() => setSelectedEpics(new Set())}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="stat-badge">
            <span className="count">{board?.totalTasks ?? 0}</span>
            <span>stories</span>
          </div>
          <div className="stat-badge">
            <div className={`connection-dot ${connected ? '' : 'disconnected'}`} />
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {board?.columns.map((col) => (
            <DroppableColumn
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={col.tasks
                .filter(t => selectedEpics.size === 0 || (t.epic && selectedEpics.has(t.epic)))
                .slice(0, col.id === 'done' ? 30 : undefined)
              }
              onCardClick={setSelectedTaskId}
              onAddClick={setCreateForColumn}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      {showRecurringModal && board && (
        <RecurringTemplatesModal
          templates={board.templates || []}
          onClose={() => setShowRecurringModal(false)}
          onCardClick={(id) => {
            // we do NOT close the recurring modal, just open the detail modal on top
            setSelectedTaskId(id);
          }}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          initialTask={
            board?.columns.flatMap(c => c.tasks).find(t => t.id === selectedTaskId) ||
            board?.templates?.find(t => t.id === selectedTaskId) ||
            null
          }
          onClose={() => setSelectedTaskId(null)}
          onUpdated={loadBoard}
          uniqueAssignees={uniqueAssignees}
          uniqueEpics={uniqueEpics}
        />
      )}

      {/* Create Task Modal */}
      {createForColumn && (
        <CreateTaskModal
          initialStatus={createForColumn}
          onClose={() => setCreateForColumn(null)}
          onCreated={loadBoard}
          uniqueAssignees={uniqueAssignees}
          uniqueEpics={uniqueEpics}
        />
      )}
    </>
  );
}
