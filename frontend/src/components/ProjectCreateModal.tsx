'use client';

import React, { useState } from 'react';
import api from '../lib/api';
import { Space, Project } from '../types';
import { X, FolderPlus } from 'lucide-react';

interface ProjectCreateModalProps {
  workspaceId: string;
  spaces?: Space[];
  initialSpaceId?: string;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

const COLOR_PRESETS = [
  '#7B68EE', // ClickUp Purple
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#64748b', // Slate
];

export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  workspaceId,
  spaces = [],
  initialSpaceId,
  onClose,
  onProjectCreated,
}) => {
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    initialSpaceId || spaces[0]?.id || ''
  );
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key.length <= 4) {
      const suggestedKey = val
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 4)
        .toUpperCase();
      setKey(suggestedKey);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      setError('Project name and key are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let res;
      if (selectedSpaceId) {
        res = await api.createProjectInSpace(selectedSpaceId, {
          name: name.trim(),
          key: key.trim().toUpperCase(),
          description: description.trim() || undefined,
          color,
        });
      } else {
        res = await api.createProject({
          workspaceId,
          name: name.trim(),
          key: key.trim().toUpperCase(),
          description: description.trim() || undefined,
          color,
        });
      }

      onProjectCreated(res.project);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-[#7B68EE]" />
            <h2 className="text-sm font-bold text-slate-900">Create New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {spaces.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Parent Space
              </label>
              <select
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    ● {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Mobile App 3.0"
              autoFocus
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Project Key (for task codes)
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. APP, WEB, API"
              maxLength={6}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of project scope..."
              rows={2}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B68EE] resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Project Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                    color === preset ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                  }`}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !key.trim()}
              className="px-5 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
