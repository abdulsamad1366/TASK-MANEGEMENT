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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a task, project, or key (Cmd+K)..."
            className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
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
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-semibold text-slate-800">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#7B68EE] transition">
                      <span className="text-[10px] font-mono">{p.key}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Tasks
              </div>
              <div className="space-y-1">
                {filteredTasks.map((t) => {
                  const p = getPriorityBadge(t.priority);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelectTask(t);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition text-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <CheckSquare className="w-4 h-4 text-slate-400 group-hover:text-[#7B68EE] shrink-0" />
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                          {t.project?.key ? `${t.project.key}-${t.taskNumber}` : `#${t.taskNumber}`}
                        </span>
                        <span className="font-medium text-slate-800 truncate">
                          {t.title}
                        </span>
                      </div>

                      <span
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0',
                          p.bg,
                          p.text,
                          p.border
                        )}
                      >
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredProjects.length === 0 && filteredTasks.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching tasks or projects found for &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
