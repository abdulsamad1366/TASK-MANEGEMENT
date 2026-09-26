'use client';

import React, { useState, useEffect } from 'react';
import { Task, Project } from '../types';
import { Search, X, CheckSquare, Folder, ArrowRight } from 'lucide-react';
import { getPriorityBadge, cn } from '../lib/utils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onSelectProject: (projectId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  onSelectTask,
  onSelectProject,
}) => {
  const [query, setQuery] = useState('');

  // Handle Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTasks = query.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description?.toLowerCase().includes(query.toLowerCase()) ||
          `${t.project?.key}-${t.taskNumber}`.toLowerCase().includes(query.toLowerCase())
      )
    : tasks.slice(0, 5);

  const filteredProjects = query.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.key.toLowerCase().includes(query.toLowerCase())
      )
    : projects.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a task, project, or key (Cmd+K)..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Projects
              </div>
              <div className="space-y-1">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.name}
                      </span>
                      <span className="font-mono text-slate-400 font-medium">({p.key})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Tasks
              </div>
              <div className="space-y-1">
                {filteredTasks.map((t) => {
                  const pBadge = getPriorityBadge(t.priority);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelectTask(t);
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-400 font-bold shrink-0">
                          {t.project?.key ? `${t.project.key}-${t.taskNumber}` : `#${t.taskNumber}`}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {t.title}
                        </span>
                      </div>

                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                          pBadge.bg,
                          pBadge.text,
                          pBadge.border
                        )}
                      >
                        {pBadge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 && filteredProjects.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching tasks or projects found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
