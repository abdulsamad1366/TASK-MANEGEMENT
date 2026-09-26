'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationPopover } from './NotificationPopover';
import { Search, ChevronDown, Check, LogOut, Settings, User as UserIcon, Sparkles, Plus, Globe, Users, User, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { FlowdeskLogo } from './FlowdeskLogo';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
  onSelectTask?: (taskId: string) => void;
  onOpenCreateWorkspace?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenSettings,
  onSelectTask,
  onOpenCreateWorkspace,
  onToggleMobileSidebar,
}) => {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getWorkspaceTypeIcon = (type?: string) => {
    switch (type) {
      case 'PERSONAL':
        return <User className="w-3.5 h-3.5 text-emerald-600" />;
      case 'COMMUNITY':
        return <Globe className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-[#7B68EE]" />;
    }
  };

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white px-3 sm:px-5 flex items-center justify-between z-40 select-none shadow-xs sticky top-0">
      {/* Left: Mobile hamburger + Brand + Active Workspace Selector */}
      <div className="flex items-center gap-2 sm:gap-4">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden transition shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Flowdesk Brand Logo */}
        <div className="pr-2 sm:pr-3 border-r border-slate-200 shrink-0">
          <FlowdeskLogo size="sm" />
        </div>

        {/* Workspace Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition text-xs font-semibold text-slate-800"
          >
            <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center font-bold text-[10px] shrink-0">
              {getWorkspaceTypeIcon(activeWorkspace?.type)}
            </div>
            <span className="truncate max-w-[90px] sm:max-w-32.5">{activeWorkspace?.name || 'Workspace'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Workspace Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Your Workspaces</span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                  {workspaces.length}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 my-1">
                {workspaces.map((ws: any) => {
                  const isCurrent = activeWorkspace?.id === (ws.workspaceId || ws.id);
                  return (
                    <div
                      key={ws.workspaceId || ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        setShowWorkspaceMenu(false);
                      }}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 hover:bg-purple-50/50 cursor-pointer text-xs transition',
                        isCurrent && 'bg-purple-50/70 font-semibold'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {getWorkspaceTypeIcon(ws.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-slate-800 text-xs font-medium">{ws.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {ws.type?.toLowerCase() || 'team'} workspace
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="w-4 h-4 text-[#7B68EE] shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action: Create or Join */}
              <div className="pt-1.5 px-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkspaceMenu(false);
                    if (onOpenCreateWorkspace) onOpenCreateWorkspace();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#7B68EE] hover:bg-purple-50 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create or Join Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Spotlight Search Bar */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-400 hover:border-slate-300 transition text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search tasks, projects, people...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-400 shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Notifications + User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 md:hidden transition"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications Popover */}
        <NotificationPopover onSelectTask={onSelectTask} />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#7B68EE] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
              <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-purple-50 text-[#7B68EE]">
                {user?.role || 'MEMBER'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              {onOpenSettings && (
                <button
                  onClick={() => {
                    onOpenSettings();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Workspace Settings</span>
                </button>
              )}

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
