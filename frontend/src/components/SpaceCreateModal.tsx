'use client';

import React, { useState } from 'react';
import api from '../lib/api';
import { X, Rocket, Sparkles, Code, Folder, Layers, Palette } from 'lucide-react';

interface SpaceCreateModalProps {
  workspaceId: string;
  onClose: () => void;
  onSpaceCreated: (space: any) => void;
}

const COLOR_PRESETS = [
  '#7B68EE', // ClickUp Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#64748B', // Slate
];

export const SpaceCreateModal: React.FC<SpaceCreateModalProps> = ({
  workspaceId,
  onClose,
  onSpaceCreated,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7B68EE');
  const [icon, setIcon] = useState('rocket');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Space name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.createSpace(workspaceId, {
        name: name.trim(),
        color,
        icon,
      });
      onSpaceCreated(res.space);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create space');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <h2 className="text-sm font-bold text-slate-900">Create New Space</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Space Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product & Design, Marketing, Growth"
              autoFocus
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Space Color
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
