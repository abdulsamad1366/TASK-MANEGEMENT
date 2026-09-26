'use client';

import React from 'react';
import { BoardColumn, Task } from '../types';
import { getPriorityBadge, formatDueDate, parseLabels, cn } from '../lib/utils';
import { Calendar, CheckSquare, MessageSquare, Paperclip } from 'lucide-react';

interface ListViewProps {
  columns: BoardColumn[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  selectedTaskIds?: string[];
  onSelectTask?: (taskId: string, selected: boolean) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  columns,
  tasks,
  onTaskClick,
  selectedTaskIds = [],
  onSelectTask,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {columns.map((column) => {
        const colTasks = tasks.filter((t) => t.columnId === column.id);

        return (
          <div
            key={column.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: column.color || '#6366f1' }}
                />
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {column.name}
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {colTasks.map((task) => {
                const priorityStyle = getPriorityBadge(task.priority);
                const { text: dueDateText, isOverdue } = formatDueDate(task.dueDate);
                const labels = parseLabels(task.labels);
                const isSelected = selectedTaskIds.includes(task.id);

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      'group flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition select-none',
                      isSelected && 'bg-indigo-50/50 dark:bg-indigo-950/20'
                    )}
                  >
                    {/* Left: Checkbox + Key + Title */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                      {onSelectTask && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            onSelectTask(task.id, e.target.checked);
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      )}

                      <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">
                        {task.project?.key ? `${task.project.key}-${task.taskNumber}` : `#${task.taskNumber}`}
                      </span>

                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {task.title}
                      </span>

                      {/* Labels */}
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {labels.slice(0, 2).map((lbl, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Priority + Due Date + Assignees */}
                    <div className="flex items-center gap-5 shrink-0 text-xs">
                      {/* Priority Badge */}
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

                      {/* Due Date */}
                      {dueDateText && (
                        <span
                          className={cn(
                            'flex items-center gap-1 font-medium w-20',
                            isOverdue
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {dueDateText}
                        </span>
                      )}

                      {/* Assignees */}
                      <div className="flex -space-x-1.5 overflow-hidden w-16 justify-end">
                        {task.assignees?.slice(0, 3).map((a) => (
                          <img
                            key={a.userId}
                            src={
                              a.user?.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                a.user?.name || 'U'
                              )}`
                            }
                            alt={a.user?.name}
                            title={a.user?.name}
                            className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No tasks in this section
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
