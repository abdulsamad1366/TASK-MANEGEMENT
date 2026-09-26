'use client';

import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { api } from '../lib/api';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Filter,
  Layers,
  Search,
  User,
  Users,
  Globe,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface GlobalTasksViewProps {
  onSelectTask: (task: Task) => void;
}

export const GlobalTasksView: React.FC<GlobalTasksViewProps> = ({ onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const loadGlobalTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyGlobalTasks();
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load global tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalTasks();
  }, []);

  // Extract unique workspaces
  const workspaces = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; type?: string }>();
    tasks.forEach((t) => {
      if (t.workspace) {
        map.set(t.workspace.id, {
          id: t.workspace.id,
          name: t.workspace.name,
          type: t.workspace.type,
        });
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    const isCompleted = t.column?.isCompleted || false;
    if (statusFilter === 'pending' && isCompleted) return false;
    if (statusFilter === 'completed' && !isCompleted) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (selectedWorkspaceId !== 'all' && t.workspace?.id !== selectedWorkspaceId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchProject = t.list?.project?.name?.toLowerCase().includes(q);
      const matchWs = t.workspace?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchProject && !matchWs) return false;
    }
    return true;
  });

  // Stats
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.column?.isCompleted).length;
  const pendingCount = totalCount - completedCount;
  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.column?.isCompleted) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">Urgent</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">High</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Low</span>;
    }
  };

  const getWorkspaceIcon = (type?: string) => {
    switch (type) {
      case 'PERSONAL':
        return <User className="w-3 h-3 text-emerald-600" />;
      case 'COMMUNITY':
        return <Globe className="w-3 h-3 text-sky-600" />;
      default:
        return <Users className="w-3 h-3 text-[#7B68EE]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Global My Tasks</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated tasks assigned to you across all your Personal, Team, and Community workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadGlobalTasks}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Assigned</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalCount}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending</div>
          <div className="text-2xl font-extrabold text-[#7B68EE] mt-1">{pendingCount}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{completedCount}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue</div>
          <div className="text-2xl font-extrabold text-rose-500 mt-1">{overdueCount}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-50">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks by title, project, or workspace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7B68EE]/20 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Workspace select */}
          <select
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.type?.toLowerCase() || 'team'})
              </option>
            ))}
          </select>

          {/* Priority select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status buttons */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/60">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition',
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition',
                statusFilter === 'pending' ? 'bg-white text-[#7B68EE] shadow-xs' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition',
                statusFilter === 'completed' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#7B68EE] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs text-slate-400 font-medium">Loading your tasks across all workspaces...</div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7B68EE] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No tasks found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || selectedWorkspaceId !== 'all' || priorityFilter !== 'all'
                ? 'Try clearing your filters to see more tasks.'
                : 'You have no tasks assigned to you right now. Create or assign a task in any workspace!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const isCompleted = task.column?.isCompleted || false;
              const isOverdue =
                task.dueDate && !isCompleted && new Date(task.dueDate) < new Date();

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="flex items-center justify-between p-3.5 hover:bg-purple-50/40 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                    {/* Completion Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-slate-300 group-hover:text-slate-400 hover:text-emerald-500 transition"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    {/* Task Title & Project / Workspace hierarchy */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs font-semibold truncate',
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                          )}
                        >
                          {task.title}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Breadcrumb Info */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                        {/* Workspace Pill */}
                        {task.workspace && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {getWorkspaceIcon(task.workspace.type)}
                            <span>{task.workspace.name}</span>
                          </span>
                        )}

                        {/* Project / List */}
                        {task.list?.project && (
                          <span className="text-slate-500 font-medium">
                            / {task.list.project.name}
                          </span>
                        )}

                        {/* Column Status */}
                        {task.column && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${task.column.color || '#7B68EE'}15`,
                              color: task.column.color || '#7B68EE',
                            }}
                          >
                            {task.column.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Due date & Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    {task.dueDate && (
                      <div
                        className={cn(
                          'flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md',
                          isOverdue
                            ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200/60'
                            : 'text-slate-500 bg-slate-50'
                        )}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}

                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#7B68EE] transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
