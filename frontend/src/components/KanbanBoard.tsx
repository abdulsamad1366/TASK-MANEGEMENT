'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import { BoardColumn, Task } from '../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
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

    // Check if moved into a completed column -> celebratory confetti!
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
      setLocalTasks(tasks);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[calc(100vh-210px)] select-none">
        {columns.map((column) => {
          const colTasks = localTasks
            .filter((t) => t.columnId === column.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={column.id}
              className="shrink-0 w-80 flex flex-col rounded-2xl bg-slate-50/70 border border-slate-200/80 max-h-[calc(100vh-210px)] shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/60 bg-white/60 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.color || '#7B68EE' }}
                  />
                  <h3 className="font-bold text-xs text-slate-800">
                    {column.name}
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => onAddTask(column.id)}
                  title="Add task to this column"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Droppable Task List */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 p-2 space-y-2 overflow-y-auto min-h-35 transition-colors',
                      snapshot.isDraggingOver && 'bg-purple-50/40 rounded-b-2xl'
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
                        className="h-20 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 cursor-pointer hover:border-purple-300 hover:text-[#7B68EE] transition"
                      >
                        <Plus className="w-3.5 h-3.5 mb-0.5" />
                        <span>Add task</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Quick Add Button at bottom of column */}
              <div className="p-2 border-t border-slate-200/50 bg-white/40 rounded-b-2xl">
                <button
                  onClick={() => onAddTask(column.id)}
                  className="w-full py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#7B68EE] hover:bg-white rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Column Button */}
        {onAddColumn && (
          <button
            onClick={onAddColumn}
            className="shrink-0 w-80 h-12 flex items-center justify-center gap-2 border border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Status Column</span>
          </button>
        )}
      </div>
    </DragDropContext>
  );
};
