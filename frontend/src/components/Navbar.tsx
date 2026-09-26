'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationPopover } from './NotificationPopover';
import { Search, Sun, Moon, ChevronDown, Check, LogOut, Settings, User as UserIcon } from 'lucide-react';
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
  const { theme, toggleTheme } = useTheme();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-40 select-none">
      {/* Left: Active Workspace Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {activeWorkspace?.name?.charAt(0) || 'W'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-35">
                {activeWorkspace?.name || 'Workspace'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Team Space</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Workspace Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Workspace
              </div>
              {workspaces.map((ws) => (
                <div
                  key={ws.workspaceId || ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setShowWorkspaceMenu(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center text-xs">
                      {ws.name?.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ws.name}
                    </span>
                  </div>
                  {activeWorkspace?.id === (ws.workspaceId || ws.id) && (
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle: Spotlight Search trigger */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition text-xs shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Search tasks, projects, people...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Notifications + Theme + User Menu */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <NotificationPopover onSelectTask={onSelectTask} />

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <img
              src={
                user?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  user?.name || 'U'
                )}`
              }
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 uppercase">
                  {user?.role}
                </span>
              </div>

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Workspace Settings</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
