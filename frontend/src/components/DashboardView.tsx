'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Task, Project } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { cn, getPriorityBadge } from '../lib/utils';

interface DashboardViewProps {
  workspaceId: string;
  projects: Project[];
  onSelectTask: (task: Task) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspaceId,
  projects,
  onSelectTask,
}) => {
  const [data, setData] = useState<any>(null);
  const [burndown, setBurndown] = useState<any>(null);
  const [selectedBurndownProjectId, setSelectedBurndownProjectId] = useState<string>(
    projects[0]?.id || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedBurndownProjectId) {
      loadBurndownData(selectedBurndownProjectId);
    }
  }, [selectedBurndownProjectId]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDashboardSummary(workspaceId);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBurndownData = async (projectId: string) => {
    try {
      const res = await api.getProjectBurndown(projectId);
      setBurndown(res);
    } catch (err) {
      console.error('Failed to load burndown:', err);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const personal = data.personal || {};
  const team = data.team || {};

  return (
    <div className="space-y-6 pb-12 select-none animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Executive Dashboard & Reporting
        </h1>
        <p className="text-xs text-slate-400">
          Real-time metrics, workload distribution, and sprint burndown trajectory
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: My Pending Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">My Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {personal.pending || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {personal.completed || 0} tasks completed
          </div>
        </div>

        {/* Card 2: Overdue Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {personal.overdue || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Requires immediate attention</div>
        </div>

        {/* Card 3: Due This Week */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Due This Week</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {personal.dueThisWeek || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {personal.dueToday || 0} due today
          </div>
        </div>

        {/* Card 4: Overall Completion Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {team.completionRate || 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {team.completedTasks || 0} of {team.totalTasks || 0} total tasks
          </div>
        </div>
      </div>

      {/* Middle Section: Burndown Velocity Chart & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Burndown Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Sprint Burndown Chart
              </h3>
              <p className="text-xs text-slate-400">
                Ideal remaining velocity vs actual team progress
              </p>
            </div>

            {/* Project Picker for burndown */}
            {projects.length > 0 && (
              <select
                value={selectedBurndownProjectId}
                onChange={(e) => setSelectedBurndownProjectId(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* SVG Burndown Chart Render */}
          {burndown?.burndown ? (
            <div className="relative pt-4">
              <div className="h-56 w-full flex items-end justify-between gap-2 px-2 pb-6 border-b border-l border-slate-200 dark:border-slate-700">
                {burndown.burndown.map((pt: any, i: number) => {
                  const maxVal = Math.max(...burndown.burndown.map((b: any) => Math.max(b.ideal, b.actual, 1)));
                  const idealHeight = (pt.ideal / maxVal) * 180;
                  const actualHeight = (pt.actual / maxVal) * 180;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                        {pt.date}: Actual {pt.actual}, Ideal {pt.ideal}
                      </div>

                      {/* Dual bars */}
                      <div className="w-full flex items-end justify-center gap-1 h-48">
                        {/* Ideal Guide Bar */}
                        <div
                          style={{ height: `${idealHeight}px` }}
                          className="w-1.5 bg-slate-300 dark:bg-slate-700 rounded-t"
                          title={`Ideal: ${pt.ideal}`}
                        />
                        {/* Actual Bar */}
                        <div
                          style={{ height: `${actualHeight}px` }}
                          className="w-2.5 bg-indigo-500 rounded-t shadow-xs"
                          title={`Actual: ${pt.actual}`}
                        />
                      </div>

                      <span className="text-[9px] text-slate-400 font-mono rotate-45 mt-2 origin-left">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-indigo-500" />
                  <span className="text-slate-600 dark:text-slate-400">Actual Tasks Remaining</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700" />
                  <span className="text-slate-600 dark:text-slate-400">Ideal Guideline</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">
              Loading burndown dataset...
            </div>
          )}
        </div>

        {/* Right 1 Col: Priority Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
              Priority Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-4">Breakdown across all active projects</p>

            <div className="space-y-3">
              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((pKey) => {
                const count =
                  team.tasksByPriority?.find((p: any) => p.priority === pKey)?.count || 0;
                const pct = team.totalTasks > 0 ? Math.round((count / team.totalTasks) * 100) : 0;
                const pStyle = getPriorityBadge(pKey as any);

                return (
                  <div key={pKey} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={pStyle.text}>{pStyle.label}</span>
                      <span className="text-slate-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', pStyle.dot)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Team Workload Table & My Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Team Workload & Capacity
              </h3>
              <p className="text-xs text-slate-400">Distribution of assigned work per teammate</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {team.workload?.map((w: any) => (
              <div
                key={w.user.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={
                      w.user.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        w.user.name
                      )}`
                    }
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {w.user.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{w.user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    <strong className="text-slate-800 dark:text-slate-200">{w.pending}</strong> active
                  </span>
                  <span className="text-emerald-500 font-semibold">
                    {w.completed} done
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Priority Action Items */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                My Priority Items
              </h3>
              <p className="text-xs text-slate-400">Tasks assigned directly to you</p>
            </div>
          </div>

          <div className="space-y-2">
            {personal.tasks?.slice(0, 5).map((t: any) => (
              <div
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition text-xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="font-mono text-slate-400 font-bold flex-shrink-0">
                    {t.project?.key ? `${t.project.key}-${t.taskNumber}` : '#'}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition">
                    {t.title}
                  </span>
                </div>

                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0',
                    getPriorityBadge(t.priority).bg,
                    getPriorityBadge(t.priority).text,
                    getPriorityBadge(t.priority).border
                  )}
                >
                  {t.priority}
                </span>
              </div>
            ))}

            {(!personal.tasks || personal.tasks.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No active tasks assigned to you right now. Great job!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
