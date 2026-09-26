'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Task, Project } from '../types';
import {
  CheckCircle2,
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7B68EE] border-t-transparent" />
      </div>
    );
  }

  const personal = data.personal || {};
  const team = data.team || {};

  return (
    <div className="space-y-5 pb-12 select-none animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Executive Dashboard & Analytics
        </h1>
        <p className="text-xs text-slate-500">
          Real-time team velocity, workload distribution, and sprint burndown trajectory
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: My Pending Tasks */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">My Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#7B68EE]" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {personal.pending || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {personal.completed || 0} tasks completed
          </div>
        </div>

        {/* Card 2: Overdue Tasks */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {personal.overdue || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Needs immediate attention</div>
        </div>

        {/* Card 3: Due This Week */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Due This Week</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {personal.dueThisWeek || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {personal.dueToday || 0} due today
          </div>
        </div>

        {/* Card 4: Overall Completion Rate */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {team.completionRate || 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {team.completedTasks || 0} of {team.totalTasks || 0} tasks
          </div>
        </div>
      </div>

      {/* Middle Section: Burndown Velocity Chart & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Burndown Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Sprint Burndown Chart
              </h3>
              <p className="text-[11px] text-slate-400">
                Ideal remaining velocity vs actual team progress
              </p>
            </div>

            {/* Project Picker for burndown */}
            {projects.length > 0 && (
              <select
                value={selectedBurndownProjectId}
                onChange={(e) => setSelectedBurndownProjectId(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
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
            <div className="relative pt-3">
              <div className="h-52 w-full flex items-end justify-between gap-2 px-2 pb-6 border-b border-l border-slate-200">
                {burndown.burndown.map((pt: any, i: number) => {
                  const maxVal = Math.max(
                    ...burndown.burndown.map((b: any) => Math.max(b.ideal, b.actual, 1))
                  );
                  const idealHeight = (pt.ideal / maxVal) * 160;
                  const actualHeight = (pt.actual / maxVal) * 160;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                        {pt.date}: Actual {pt.actual}, Ideal {pt.ideal}
                      </div>

                      {/* Dual bars */}
                      <div className="w-full flex items-end justify-center gap-1 h-44">
                        {/* Ideal Guide Bar */}
                        <div
                          style={{ height: `${idealHeight}px` }}
                          className="w-1.5 bg-slate-200 rounded-t"
                          title={`Ideal: ${pt.ideal}`}
                        />
                        {/* Actual Bar */}
                        <div
                          style={{ height: `${actualHeight}px` }}
                          className="w-2.5 bg-[#7B68EE] rounded-t shadow-xs"
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

              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-[#7B68EE]" />
                  <span className="text-slate-600">Actual Tasks Remaining</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200" />
                  <span className="text-slate-600">Ideal Guideline</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">
              No burndown data available for this project
            </div>
          )}
        </div>

        {/* Right 1 Col: Priority Distribution */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-1">
              Priority Distribution
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">Active task breakdown</p>

            <div className="space-y-3">
              {[
                { label: 'Urgent', count: team.priorityBreakdown?.URGENT || 0, color: 'bg-red-500' },
                { label: 'High', count: team.priorityBreakdown?.HIGH || 0, color: 'bg-amber-500' },
                { label: 'Normal', count: team.priorityBreakdown?.MEDIUM || 0, color: 'bg-[#7B68EE]' },
                { label: 'Low', count: team.priorityBreakdown?.LOW || 0, color: 'bg-slate-400' },
              ].map((p, idx) => {
                const total = team.totalTasks || 1;
                const pct = Math.round((p.count / total) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{p.label}</span>
                      <span className="text-slate-500 font-mono">
                        {p.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', p.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Team Workload & Tasks per Project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Team Workload */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Team Workload
              </h3>
              <p className="text-[11px] text-slate-400">Assigned task distribution per member</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {team.workload?.map((w: any) => (
              <div
                key={w.user.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {w.user.avatarUrl ? (
                    <img
                      src={w.user.avatarUrl}
                      alt={w.user.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#7B68EE] text-white font-bold flex items-center justify-center text-[10px]">
                      {w.user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-800">{w.user.name}</div>
                    <div className="text-[10px] text-slate-400">{w.user.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-800">
                    <strong>{w.pending}</strong> active
                  </div>
                  <div className="text-[10px] text-emerald-600">{w.completed} done</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned to Me / Quick Actions */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Recent Tasks
              </h3>
              <p className="text-[11px] text-slate-400">Your currently active assignments</p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-1.5">
            {personal.assignedTasks?.slice(0, 5).map((t: Task) => (
              <div
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition text-xs group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {t.project?.key ? `${t.project.key}-${t.taskNumber}` : `#${t.taskNumber}`}
                  </span>
                  <span className="font-medium text-slate-800 truncate group-hover:text-[#7B68EE] transition">
                    {t.title}
                  </span>
                </div>

                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#7B68EE] shrink-0 transition" />
              </div>
            ))}

            {(!personal.assignedTasks || personal.assignedTasks.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No active tasks assigned to you right now
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
