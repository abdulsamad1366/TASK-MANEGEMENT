'use client';

import React from 'react';
import { Project, Workspace } from '../types';
import {
  LayoutDashboard,
  CheckCircle2,
  Folder,
  Plus,
  Settings,
  Users,
  BarChart3,
  Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentTab: 'dashboard' | 'project' | 'settings';
  selectedProjectId: string | null;
  projects: Project[];
  activeWorkspace: Workspace | null;
  onSelectTab: (tab: 'dashboard' | 'project' | 'settings') => void;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onInviteMember: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  selectedProjectId,
  projects,
  activeWorkspace,
  onSelectTab,
  onSelectProject,
  onNewProject,
  onInviteMember,
}) => {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-between p-4 h-[calc(100vh-64px)] overflow-y-auto select-none">
      <div className="space-y-6">
        {/* Core Navigation Items */}
        <div className="space-y-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition',
              currentTab === 'dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-500" />
            <span>Dashboard & Overview</span>
          </button>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Projects ({projects.length})
            </span>
            <button
              onClick={onNewProject}
              title="Create new project"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((p) => {
              const isSelected = currentTab === 'project' && selectedProjectId === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p.id);
                    onSelectTab('project');
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left group',
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                    {p.key}
                  </span>
                </button>
              );
            })}

            {projects.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-400 italic">No projects yet</div>
            )}
          </div>
        </div>

        {/* Team Collaboration Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Team
          </div>
          <div className="space-y-1">
            <button
              onClick={onInviteMember}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Invite Teammates</span>
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition',
                currentTab === 'settings'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Workspace Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Workspace Info */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 px-2 flex items-center justify-between">
        <span className="truncate">{activeWorkspace?.name}</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          PRO
        </span>
      </div>
    </aside>
  );
};
