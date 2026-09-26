'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  Shield,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { Workspace, WorkspaceType, WorkspaceJoinPolicy } from '../types';

interface WorkspaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: (workspace: Workspace) => void;
}

export const WorkspaceCreateModal: React.FC<WorkspaceCreateModalProps> = ({
  isOpen,
  onClose,
  onWorkspaceCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [selectedType, setSelectedType] = useState<WorkspaceType>('TEAM');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<WorkspaceJoinPolicy>('INVITE_ONLY');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.createWorkspace({
        name: name.trim(),
        description: description.trim(),
        type: selectedType,
        joinPolicy: selectedType === 'COMMUNITY' ? 'PUBLIC_LINK' : joinPolicy,
      });

      if (res.workspace) {
        onWorkspaceCreated(res.workspace);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      setError('Please enter a valid invite code or community link');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.joinWorkspace({
        inviteCode: inviteCodeInput.trim(),
      });

      if (res.workspace) {
        setSuccessMsg(res.message || 'Successfully joined workspace!');
        setTimeout(() => {
          onWorkspaceCreated(res.workspace);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7B68EE] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Multi-Tenant Workspaces</h2>
              <p className="text-xs text-slate-500">
                Create an isolated space or join an existing community
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Create vs Join */}
        <div className="flex bg-slate-100 p-1 rounded-xl my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'create'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create New Workspace
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('join');
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'join'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Join with Invite Code
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Workspace Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Workspace Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Personal */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('PERSONAL');
                    setJoinPolicy('INVITE_ONLY');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1.5 ${
                    selectedType === 'PERSONAL'
                      ? 'border-[#7B68EE] bg-purple-50/50 ring-1 ring-[#7B68EE]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-800">Personal</div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Solo productivity space. Strictly private to you.
                  </p>
                </button>

                {/* Team */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('TEAM');
                    setJoinPolicy('INVITE_ONLY');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1.5 ${
                    selectedType === 'TEAM'
                      ? 'border-[#7B68EE] bg-purple-50/50 ring-1 ring-[#7B68EE]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#7B68EE] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-800">Team / Group</div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Private workspace with roles (Admin, Manager, Member).
                  </p>
                </button>

                {/* Community */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('COMMUNITY');
                    setJoinPolicy('PUBLIC_LINK');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1.5 ${
                    selectedType === 'COMMUNITY'
                      ? 'border-[#7B68EE] bg-purple-50/50 ring-1 ring-[#7B68EE]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-800">Community</div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Open group with shareable public join code & links.
                  </p>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  selectedType === 'PERSONAL'
                    ? 'e.g. My Personal Space'
                    : selectedType === 'COMMUNITY'
                    ? 'e.g. Open Source Builders Club'
                    : 'e.g. Acme Product Engineering'
                }
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workspace dedicated to?"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#7B68EE] hover:bg-[#6c58dc] rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting ? (
                  'Creating...'
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-[#7B68EE] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Join Any Community or Team</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter the invite code or community token provided by the workspace administrator.
                </p>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  Sample Public Code:{' '}
                  <button
                    type="button"
                    onClick={() => setInviteCodeInput('COMMUNITY-FLOWDESK-2026')}
                    className="text-[#7B68EE] font-bold hover:underline"
                  >
                    COMMUNITY-FLOWDESK-2026
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Workspace Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="e.g. COMMUNITY-FLOWDESK-2026"
                className="w-full px-3.5 py-2.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#7B68EE] hover:bg-[#6c58dc] rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting ? (
                  'Joining...'
                ) : (
                  <>
                    <span>Join Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
