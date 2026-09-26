'use client';

import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface NotificationPopoverProps {
  onSelectTask?: (taskId: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onSelectTask }) => {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-slate-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-50 text-red-500">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1 text-slate-400 hover:text-[#7B68EE] transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="p-1 text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id);
                  if (n.entityType === 'TASK' && n.entityId && onSelectTask) {
                    onSelectTask(n.entityId);
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  'p-3 flex items-start gap-2.5 hover:bg-slate-50 cursor-pointer transition text-xs',
                  !n.isRead && 'bg-purple-50/50'
                )}
              >
                <img
                  src={
                    n.actor?.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      n.actor?.name || 'A'
                    )}`
                  }
                  alt=""
                  className="w-6 h-6 rounded-full object-cover mt-0.5"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-800 truncate">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2 shrink-0">
                      {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-2">
                    {n.message}
                  </p>
                </div>

                {!n.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B68EE] mt-2 shrink-0" />
                )}
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-400">
                You are all caught up! No notifications.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
