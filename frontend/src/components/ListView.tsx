'use client';

import React from 'react';
import { BoardColumn, Task } from '../types';
import { getPriorityBadge, formatDueDate, parseLabels, cn } from '../lib/utils';
import { Calendar, CheckSquare, MessageSquare, Paperclip, Clock } from 'lucide-react';

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
    <div className="space-y-5 pb-12">
      {columns.map((column) => {
        const colTasks = tasks.filter((t) => t.columnId === column.id);

        return (
          <div
            key={column.id}
            className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-xs"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: column.color || '#7B68EE' }}
                />
                <h3 className="font-bold text-xs text-slate-800">
                  {column.name}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/60 text-slate-600">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-slate-100">
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
                      'group flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/80 cursor-pointer transition select-none',
                      isSelected && 'bg-purple-50/60'
                    )}
                  >
                    {/* Left: Checkbox + Key + Title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                      {onSelectTask && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            onSelectTask(task.id, e.target.checked);
                          }}
                          className="rounded border-slate-300 text-[#7B68EE] focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                        />
                      )}

                      <span className="text-[11px] font-mono font-semibold text-slate-400 w-16 shrink-0">
                        {task.project?.key ? `${task.project.key}-${task.taskNumber}` : `#${task.taskNumber}`}
                      </span>

                      <span className="text-xs font-medium text-slate-800 truncate">
                        {task.title}
                      </span>

                      {/* Labels */}
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {labels.slice(0, 2).map((lbl, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            #{lbl}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Priority, Due Date, Estimate, Comments, Assignees */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Priority */}
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border hidden sm:flex items-center gap-1',
                          priorityStyle.bg,
                          priorityStyle.text,
                          priorityStyle.border
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', priorityStyle.dot)} />
                        {priorityStyle.label}
                      </span>

                      {/* Estimate */}
                      {task.timeEstimate && (
                        <span className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {task.timeEstimate}
                        </span>
                      )}

                      {/* Due Date */}
                      {dueDateText && (
                        <span
                          className={cn(
                            'hidden sm:flex items-center gap-1 text-[11px]',
                            isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          {dueDateText}
                        </span>
                      )}

                      {/* Subtasks */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-400">
                          <CheckSquare className="w-3 h-3" />
                          {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length}
                        </span>
                      )}

                      {/* Comments */}
                      {(task._count?.comments || 0) > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <MessageSquare className="w-3 h-3 text-[#7B68EE]" />
                          {task._count?.comments}
                        </span>
                      )}

                      {/* Assignees */}
                      <div className="flex -space-x-1.5 overflow-hidden w-14 justify-end">
                        {task.assignees && task.assignees.length > 0 ? (
                          task.assignees.slice(0, 2).map((a) => (
                            <img
                              key={a.userId}
                              src={
                                a.user?.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  a.user?.name || 'User'
                                )}`
                              }
                              alt={a.user?.name}
                              title={a.user?.name}
                              className="w-5 h-5 rounded-full ring-2 ring-white object-cover"
                            />
                          ))
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                            -
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div className="px-5 py-3 text-xs text-slate-400 italic">No tasks in this status</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
