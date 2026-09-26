'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationPopover } from './NotificationPopover';
import { Search, ChevronDown, Check, LogOut, Settings, User as UserIcon, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenSettings,
  onSelectTask,
}) => {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white px-5 flex items-center justify-between z-40 select-none shadow-xs">
      {/* Left: Brand + Active Workspace Selector */}
      <div className="flex items-center gap-4">
        {/* ClickUp Brand Icon */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-[#7B68EE] flex items-center justify-center text-white shadow-xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M4 14.5L12 6.5L20 14.5L17.5 17L12 11.5L6.5 17L4 14.5Z" />
            </svg>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-900">
            Click<span className="text-[#7B68EE]">Up</span>
          </span>
        </div>

        {/* Workspace Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition text-xs font-semibold text-slate-800"
          >
            <div className="w-5 h-5 rounded-md bg-purple-100 text-[#7B68EE] flex items-center justify-center font-bold text-[10px]">
              {activeWorkspace?.name?.charAt(0) || 'W'}
            </div>
            <span className="truncate max-w-[130px]">{activeWorkspace?.name || 'Workspace'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Workspace Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>
              {workspaces.map((ws) => (
                <div
                  key={ws.workspaceId || ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setShowWorkspaceMenu(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-purple-50 text-[#7B68EE] font-bold flex items-center justify-center text-[10px]">
                      {ws.name?.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-800">{ws.name}</span>
                  </div>
                  {activeWorkspace?.id === (ws.workspaceId || ws.id) && (
                    <Check className="w-3.5 h-3.5 text-[#7B68EE]" />
                  )}
                </div>
              ))}
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
