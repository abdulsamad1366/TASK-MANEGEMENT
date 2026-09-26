'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import { BoardColumn, Task } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

interface KanbanBoardProps {
  columns: BoardColumn[];
  tasks: Task[];
  onTaskMove: (taskId: string, destColumnId: string, newOrder: number) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onAddColumn?: () => void;
  selectedTaskIds?: string[];
  onSelectTask?: (taskId: string, selected: boolean) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  onTaskMove,
  onTaskClick,
  onAddTask,
  onAddColumn,
  selectedTaskIds = [],
  onSelectTask,
}) => {
  // Local optimistic state for fluid 60fps drag & drop
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    // Filter tasks in destination column
    const destTasks = localTasks
      .filter((t) => t.columnId === destColId && t.id !== draggableId)
      .sort((a, b) => a.order - b.order);

    // Calculate new order
    let newOrder = 1000;
    if (destTasks.length === 0) {
      newOrder = 1000;
    } else if (destination.index === 0) {
      newOrder = (destTasks[0]?.order || 1000) / 2;
    } else if (destination.index >= destTasks.length) {
      newOrder = (destTasks[destTasks.length - 1]?.order || 1000) + 1000;
    } else {
      const prevOrder = destTasks[destination.index - 1].order;
      const nextOrder = destTasks[destination.index].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    // Check if moved into a completed column -> fire celebratory confetti!
    const targetColumn = columns.find((c) => c.id === destColId);
    if (targetColumn?.isCompleted && sourceColId !== destColId) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Confetti optional
      }
    }

    // Optimistic UI update
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === draggableId ? { ...t, columnId: destColId, order: newOrder } : t
      )
    );

    // Call backend API
    try {
      await onTaskMove(draggableId, destColId, newOrder);
    } catch (err) {
      console.error('Failed to sync task move:', err);
      // Revert to props tasks if API call fails
      setLocalTasks(tasks);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 items-start min-h-[calc(100vh-230px)] select-none">
        {columns.map((column) => {
          const colTasks = localTasks
            .filter((t) => t.columnId === column.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 max-h-[calc(100vh-220px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: column.color || '#6366f1' }}
                  />
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    {column.name}
                  </h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onAddTask(column.id)}
                    title="Add task to this column"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Droppable Task List */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[140px] transition-colors',
                      snapshot.isDraggingOver && 'bg-indigo-500/5 dark:bg-indigo-500/10 rounded-b-2xl'
                    )}
                  >
                    {colTasks.map((task, idx) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={idx}
                        onClick={onTaskClick}
                        isSelected={selectedTaskIds.includes(task.id)}
                        onSelect={onSelectTask}
                      />
                    ))}
                    {provided.placeholder}

                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div
                        onClick={() => onAddTask(column.id)}
                        className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-400 dark:text-slate-500 cursor-pointer hover:border-indigo-400/50 hover:text-indigo-500 transition"
                      >
                        <Plus className="w-4 h-4 mb-1" />
                        <span>Add task</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Quick Add Button at bottom of column */}
              <div className="p-2 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                  onClick={() => onAddTask(column.id)}
                  className="w-full py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Add New Column Column Button */}
        {onAddColumn && (
          <button
            onClick={onAddColumn}
            className="flex-shrink-0 w-80 h-14 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Column</span>
          </button>
        )}
      </div>
    </DragDropContext>
  );
};
