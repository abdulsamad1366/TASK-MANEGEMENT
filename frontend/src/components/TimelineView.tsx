'use client';

import React from 'react';
import { Task } from '../types';
import { format, addDays, startOfToday, differenceInDays } from 'date-fns';
import { getPriorityBadge, cn } from '../lib/utils';
import { Clock } from 'lucide-react';

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskClick }) => {
  const today = startOfToday();
  const totalDays = 21; // 3 weeks view
  const days = Array.from({ length: totalDays }).map((_, i) => addDays(today, i - 3));

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-x-auto">
      <div className="min-w-200">
        {/* Timeline Header Days */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
          <div className="w-64 font-bold text-xs text-slate-400 uppercase tracking-wider shrink-0">
            Task
          </div>
          <div className="flex-1 grid grid-cols-21 gap-1 text-center">
            {days.map((d, idx) => (
              <div
                key={idx}
                className={cn(
                  'text-[10px] font-semibold py-1 rounded',
                  format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-500'
                )}
              >
                <div>{format(d, 'EEE')}</div>
                <div className="text-xs">{format(d, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="space-y-3">
          {tasks.map((task) => {
            const p = getPriorityBadge(task.priority);

            // Compute start day offset and duration
            const taskStart = task.startDate ? new Date(task.startDate) : today;
            const taskEnd = task.dueDate ? new Date(task.dueDate) : addDays(taskStart, 2);

            const startOffset = Math.max(0, Math.min(totalDays - 1, differenceInDays(taskStart, days[0])));
            const endOffset = Math.max(startOffset, Math.min(totalDays - 1, differenceInDays(taskEnd, days[0])));
            const spanDays = Math.max(1, endOffset - startOffset + 1);

            return (
              <div key={task.id} className="flex items-center group py-1">
                {/* Task Label on left */}
                <div
                  onClick={() => onTaskClick(task)}
                  className="w-64 shrink-0 cursor-pointer pr-4"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {task.title}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {task.project?.key ? `${task.project.key}-${task.taskNumber}` : ''}
                  </div>
                </div>

                {/* Timeline Bar Container */}
                <div className="flex-1 relative h-8 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center px-1">
                  <div
                    onClick={() => onTaskClick(task)}
                    style={{
                      left: `${(startOffset / totalDays) * 100}%`,
                      width: `${(spanDays / totalDays) * 100}%`,
                    }}
                    className={cn(
                      'absolute h-6 rounded-md px-2 flex items-center justify-between text-[11px] font-semibold cursor-pointer shadow-sm hover:opacity-90 transition-all border',
                      p.bg,
                      p.text,
                      p.border
                    )}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="text-[9px] opacity-75 ml-1">
                      {task.column?.name || 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
