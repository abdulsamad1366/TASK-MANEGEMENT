'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../types';
import { getPriorityBadge, formatDueDate, parseLabels, cn } from '../lib/utils';
import { Calendar, CheckSquare, MessageSquare, Paperclip, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onClick,
  isSelected,
  onSelect,
}) => {
  const priorityStyle = getPriorityBadge(task.priority);
  const { text: dueDateText, isOverdue } = formatDueDate(task.dueDate);
  const labels = parseLabels(task.labels);

  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={cn(
            'group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none',
            'bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/90',
            'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow',
            snapshot.isDragging && 'shadow-2xl scale-[1.02] border-indigo-500 ring-2 ring-indigo-500/20 z-50',
            isSelected && 'ring-2 ring-indigo-500 border-indigo-500'
          )}
        >
          {/* Header: Project Key & Selection Checkbox & Priority */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {onSelect && (
                <input
                  type="checkbox"
                  checked={isSelected || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelect(task.id, e.target.checked);
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
              <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
                {task.project?.key ? `${task.project.key}-${task.taskNumber}` : `#${task.taskNumber}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {task.blockedBy && task.blockedBy.length > 0 && (
                <span
                  title="This task has blocking dependencies"
                  className="text-amber-500 flex items-center"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                </span>
              )}
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1',
                  priorityStyle.bg,
                  priorityStyle.text,
                  priorityStyle.border
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', priorityStyle.dot)} />
                {priorityStyle.label}
              </span>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 leading-snug">
            {task.title}
          </h4>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {labels.slice(0, 3).map((lbl, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                >
                  {lbl}
                </span>
              ))}
              {labels.length > 3 && (
                <span className="text-[10px] text-slate-400 font-medium">+{labels.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              {dueDateText && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-medium',
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {dueDateText}
                </span>
              )}

              {totalSubtasks > 0 && (
                <span className="flex items-center gap-1 text-[11px]">
                  <CheckSquare className="w-3 h-3" />
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}

              {(task._count?.comments || 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px]">
                  <MessageSquare className="w-3 h-3" />
                  {task._count?.comments}
                </span>
              )}

              {(task._count?.attachments || 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px]">
                  <Paperclip className="w-3 h-3" />
                  {task._count?.attachments}
                </span>
              )}
            </div>

            {/* Assignee Avatars */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-1.5 overflow-hidden">
                {task.assignees.slice(0, 3).map((a) => (
                  <img
                    key={a.userId}
                    src={
                      a.user?.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        a.user?.name || 'User'
                      )}`
                    }
                    alt={a.user?.name || 'Assignee'}
                    title={a.user?.name}
                    className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                  />
                ))}
                {task.assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-medium flex items-center justify-center ring-2 ring-white dark:ring-slate-900 text-slate-600 dark:text-slate-300">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
