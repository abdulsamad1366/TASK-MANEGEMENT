'use client';

import React, { useState } from 'react';
import { Task } from '../types';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getPriorityBadge, cn } from '../lib/utils';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#7B68EE]" />
          <h2 className="text-sm font-bold text-slate-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-px mb-2 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-[11px] font-bold text-slate-400 py-1 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          const dayTasks = tasks.filter((t) => {
            if (!t.dueDate) return false;
            return isSameDay(new Date(t.dueDate), day);
          });

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-25 p-2 rounded-xl border flex flex-col transition',
                isCurrentMonth
                  ? 'bg-slate-50/60 border-slate-200/80'
                  : 'bg-slate-50/20 border-slate-100 opacity-40',
                isToday && 'ring-2 ring-[#7B68EE] border-[#7B68EE]'
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={cn(
                    'text-xs font-bold px-1.5 py-0.5 rounded-full',
                    isToday ? 'bg-[#7B68EE] text-white' : 'text-slate-700'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
              </div>

              {/* Day tasks chips */}
              <div className="space-y-1 overflow-y-auto max-h-17.5 pr-0.5">
                {dayTasks.map((t) => {
                  const p = getPriorityBadge(t.priority);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition border hover:opacity-90',
                        p.bg,
                        p.text,
                        p.border
                      )}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
