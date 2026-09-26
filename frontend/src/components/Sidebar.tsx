'use client';

import React, { useState } from 'react';
import { Space, Project, TaskList, Workspace } from '../types';
import {
  LayoutDashboard,
  CheckCircle2,
  Folder,
  Plus,
  Settings,
  Users,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Sparkles,
  Rocket,
  FolderPlus,
  Layers,
  User,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentTab: 'dashboard' | 'project' | 'settings' | 'global-tasks';
  spaces: Space[];
  selectedSpaceId: string | null;
  selectedProjectId: string | null;
  selectedListId: string | null;
  activeWorkspace: Workspace | null;
  onSelectTab: (tab: 'dashboard' | 'project' | 'settings' | 'global-tasks') => void;
  onSelectSpace: (spaceId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectList: (listId: string) => void;
  onNewSpace: () => void;
  onNewProject: (spaceId?: string) => void;
  onNewList: (projectId: string) => void;
  onInviteMember: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  spaces,
  selectedSpaceId,
  selectedProjectId,
  selectedListId,
  activeWorkspace,
  onSelectTab,
  onSelectSpace,
  onSelectProject,
  onSelectList,
  onNewSpace,
  onNewProject,
  onNewList,
  onInviteMember,
}) => {
  // Track expanded states for Spaces and Projects
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({
    // Auto-expand first space by default
    ...(spaces[0]?.id ? { [spaces[0].id]: true } : {}),
  });

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    // Auto-expand first project by default
    ...(spaces[0]?.projects?.[0]?.id ? { [spaces[0].projects[0].id]: true } : {}),
  });

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyInviteCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleSpace = (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSpaces((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }));
  };

  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  return (
    <aside className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between p-3.5 h-[calc(100vh-64px)] overflow-y-auto select-none">
      <div className="space-y-5">
        {/* Core Navigation: Dashboard & Global My Tasks */}
        <div className="space-y-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition',
              currentTab === 'dashboard'
                ? 'bg-purple-50 text-[#7B68EE]'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <LayoutDashboard className="w-4 h-4 text-[#7B68EE]" />
            <span>Dashboard & Overview</span>
          </button>

          <button
            onClick={() => onSelectTab('global-tasks')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition',
              currentTab === 'global-tasks'
                ? 'bg-purple-50 text-[#7B68EE]'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Global My Tasks</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">
              All Workspaces
            </span>
          </button>
        </div>

        {/* ClickUp Spaces > Projects > Lists Tree */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              SPACES ({spaces.length})
            </span>
            <button
              onClick={onNewSpace}
              title="Create new Space"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex items-center gap-1 text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Spaces Tree */}
          <div className="space-y-1.5">
            {spaces.map((space) => {
              const isSpaceExpanded = expandedSpaces[space.id] ?? true;
              const isSpaceSelected = selectedSpaceId === space.id && currentTab === 'project';

              return (
                <div key={space.id} className="space-y-1">
                  {/* Space Row */}
                  <div
                    onClick={() => {
                      onSelectSpace(space.id);
                      onSelectTab('project');
                    }}
                    className={cn(
                      'group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition text-left cursor-pointer',
                      isSpaceSelected
                        ? 'bg-slate-100/90 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <button
                        type="button"
                        onClick={(e) => toggleSpace(space.id, e)}
                        className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                      >
                        {isSpaceExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: space.color || '#7B68EE' }}
                      />
                      <span className="truncate">{space.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewProject(space.id);
                      }}
                      title="Add Project in Space"
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Projects within Space */}
                  {isSpaceExpanded && space.projects && space.projects.length > 0 && (
                    <div className="pl-4 space-y-1 border-l border-slate-100 ml-3">
                      {space.projects.map((proj) => {
                        const isProjExpanded = expandedProjects[proj.id] ?? true;
                        const isProjSelected = selectedProjectId === proj.id && currentTab === 'project';

                        return (
                          <div key={proj.id} className="space-y-0.5">
                            {/* Project Row */}
                            <div
                              onClick={() => {
                                onSelectProject(proj.id);
                                onSelectTab('project');
                              }}
                              className={cn(
                                'group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition text-left cursor-pointer',
                                isProjSelected && !selectedListId
                                  ? 'bg-purple-50 text-[#7B68EE]'
                                  : 'text-slate-600 hover:bg-slate-50'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <button
                                  type="button"
                                  onClick={(e) => toggleProject(proj.id, e)}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                                >
                                  {isProjExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>

                                <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{proj.name}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-slate-400">
                                  {proj.key}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNewList(proj.id);
                                  }}
                                  title="Add List in Project"
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 rounded transition"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>

                            {/* Lists within Project */}
                            {isProjExpanded && proj.lists && proj.lists.length > 0 && (
                              <div className="pl-4 space-y-0.5 border-l border-slate-100 ml-3">
                                {proj.lists.map((list) => {
                                  const isListSelected =
                                    selectedListId === list.id && currentTab === 'project';

                                  return (
                                    <button
                                      key={list.id}
                                      onClick={() => {
                                        onSelectProject(proj.id);
                                        onSelectList(list.id);
                                        onSelectTab('project');
                                      }}
                                      className={cn(
                                        'w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-medium transition text-left group',
                                        isListSelected
                                          ? 'bg-purple-100/70 text-[#7B68EE] font-bold'
                                          : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <ListTodo className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{list.name}</span>
                                      </div>

                                      {list._count?.tasks !== undefined && (
                                        <span className="text-[10px] font-mono px-1.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-200">
                                          {list._count.tasks}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {spaces.length === 0 && (
              <div className="px-2 py-3 text-xs text-slate-400 italic">No spaces yet</div>
            )}
          </div>
        </div>

        {/* Team Collaboration Section */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            WORKSPACE
          </div>
          <div className="space-y-1">
            <button
              onClick={onInviteMember}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Invite Teammates</span>
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition',
                currentTab === 'settings'
                  ? 'bg-purple-50 text-[#7B68EE] font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Workspace Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Multi-Tenant Workspace Info */}
      <div className="pt-3 border-t border-slate-200/80 px-1 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            {activeWorkspace?.type === 'PERSONAL' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200/60">
                <User className="w-2.5 h-2.5" />
                Personal
              </span>
            ) : activeWorkspace?.type === 'COMMUNITY' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold text-[10px] border border-sky-200/60">
                <Globe className="w-2.5 h-2.5" />
                Community
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7B68EE] font-semibold text-[10px] border border-purple-200/60">
                <Users className="w-2.5 h-2.5" />
                Team
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {activeWorkspace?.plan || 'PRO'}
            </span>
          </div>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
            FLOWDESK
          </span>
        </div>

        {/* Invite Code Quick Copy if present */}
        {activeWorkspace?.inviteCode && (
          <button
            type="button"
            onClick={(e) => handleCopyInviteCode(e, activeWorkspace.inviteCode!)}
            title="Click to copy workspace invite code"
            className="w-full flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 hover:bg-purple-50 border border-slate-200/60 text-[10px] text-slate-600 hover:text-[#7B68EE] transition group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 font-mono">Code:</span>
              <span className="font-mono font-bold truncate">{activeWorkspace.inviteCode}</span>
            </div>
            {copiedCode ? (
              <span className="text-emerald-600 font-bold text-[9px] flex items-center gap-0.5">
                <Check className="w-3 h-3" />
                Copied
              </span>
            ) : (
              <Copy className="w-3 h-3 text-slate-400 group-hover:text-[#7B68EE] transition" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
