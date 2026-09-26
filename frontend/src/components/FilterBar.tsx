'use client';

import React from 'react';
import { BoardView, FilterState, WorkspaceMember, BoardColumn, Priority } from '../types';
import {
  Kanban,
  List,
  Calendar as CalendarIcon,
  Clock,
  Search,
  Plus,
  Filter,
  Users,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FilterBarProps {
  currentView: BoardView;
  onViewChange: (view: BoardView) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  workspaceMembers: WorkspaceMember[];
  columns: BoardColumn[];
  onNewTask: () => void;
  selectedTaskCount?: number;
  onBulkUpdate?: (updates: { columnId?: string; priority?: Priority }) => void;
  onClearSelection?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentView,
  onViewChange,
  filters,
  onFilterChange,
  workspaceMembers,
  columns,
  onNewTask,
  selectedTaskCount = 0,
  onBulkUpdate,
  onClearSelection,
}) => {
  const views: { id: BoardView; label: string; icon: React.ReactNode }[] = [
    { id: 'kanban', label: 'Board', icon: <Kanban className="w-3.5 h-3.5" /> },
    { id: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-3.5 h-3.5" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  const quickFilters: { id: FilterState['quickView']; label: string }[] = [
    { id: 'all', label: 'All Tasks' },
    { id: 'my_tasks', label: 'My Tasks' },
    { id: 'due_today', label: 'Due Today' },
    { id: 'due_this_week', label: 'This Week' },
    { id: 'overdue', label: 'Overdue' },
  ];

  return (
    <div className="space-y-3.5 mb-5">
      {/* Top Row: View Switcher Tabs + Search + Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                currentView === v.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {v.icon}
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Filter tasks..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-48 transition"
            />
          </div>

          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Middle Row: Quick Filter Pills & Dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              onClick={() => onFilterChange({ ...filters, quickView: qf.id })}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition border',
                filters.quickView === qf.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              {qf.label}
            </button>
          ))}
        </div>

        {/* Filter Dropdowns: Assignee & Priority */}
        <div className="flex items-center gap-2">
          {/* Assignee Filter */}
          <select
            value={filters.assigneeId}
            onChange={(e) => onFilterChange({ ...filters, assigneeId: e.target.value })}
            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="">All Assignees</option>
            {workspaceMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(filters.search || filters.assigneeId || filters.priority || filters.quickView !== 'all') && (
            <button
              onClick={() =>
                onFilterChange({
                  search: '',
                  assigneeId: '',
                  priority: '',
                  status: '',
                  label: '',
                  quickView: 'all',
                })
              }
              className="text-xs text-rose-500 hover:underline px-1 font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar if tasks are selected */}
      {selectedTaskCount > 0 && onBulkUpdate && (
        <div className="flex items-center justify-between p-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              {selectedTaskCount} tasks selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk status move */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Move to:</span>
              <select
                onChange={(e) => onBulkUpdate({ columnId: e.target.value })}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <option value="">Choose Column...</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk priority change */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Priority:</span>
              <select
                onChange={(e) => onBulkUpdate({ priority: e.target.value as Priority })}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <option value="">Choose Priority...</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                Deselect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
