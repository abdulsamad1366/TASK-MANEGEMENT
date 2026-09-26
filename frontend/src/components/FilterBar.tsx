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
    <div className="space-y-3 mb-4">
      {/* Top Row: View Switcher Tabs + Search + Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* ClickUp View Switcher Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 overflow-x-auto max-w-full">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition shrink-0',
                currentView === v.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {v.icon}
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Search tasks..."
              className="text-xs pl-7 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-[#7B68EE] outline-none w-32 sm:w-44 transition"
            />
          </div>

          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Middle Row: Quick Filter Pills & Dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              onClick={() => onFilterChange({ ...filters, quickView: qf.id })}
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-medium transition border shrink-0',
                filters.quickView === qf.id
                  ? 'bg-purple-50 border-purple-200 text-[#7B68EE] font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
            className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 outline-none cursor-pointer"
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
            className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Normal</option>
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
              className="text-xs text-red-500 hover:underline px-1 font-semibold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar if tasks are selected */}
      {selectedTaskCount > 0 && onBulkUpdate && (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg bg-purple-50 border border-purple-200 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#7B68EE]">
              {selectedTaskCount} tasks selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk status move */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Move to:</span>
              <select
                onChange={(e) => onBulkUpdate({ columnId: e.target.value })}
                className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 cursor-pointer"
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
              <span className="text-slate-500">Priority:</span>
              <select
                onChange={(e) => onBulkUpdate({ priority: e.target.value as Priority })}
                className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 cursor-pointer"
              >
                <option value="">Choose Priority...</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
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
