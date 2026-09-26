'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Workspace, WorkspaceType } from '../types';
import {
  User,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  Plus,
  X,
  Mail,
  CheckCircle2,
  Rocket,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { FlowdeskLogo } from './FlowdeskLogo';

interface OnboardingWizardProps {
  onComplete: (workspace: Workspace) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Workspace details
  const [name, setName] = useState(user?.name ? `${user.name}'s Workspace` : '');
  const [type, setType] = useState<WorkspaceType>('TEAM');
  const [createdWorkspace, setCreatedWorkspace] = useState<Workspace | null>(null);

  // Step 2: Teammates invite
  const [emailInput, setEmailInput] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Create Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for your workspace');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.createWorkspace({
        name: name.trim(),
        type,
        joinPolicy: type === 'COMMUNITY' ? 'PUBLIC_LINK' : 'INVITE_ONLY',
      });

      if (res.workspace) {
        setCreatedWorkspace(res.workspace);
        await refreshUser();
        // If personal workspace, can skip directly to confirmation or proceed to invite
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Add email chip
  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (inviteEmails.includes(trimmed)) {
      setError('This email has already been added to the list');
      return;
    }

    setInviteEmails([...inviteEmails, trimmed]);
    setEmailInput('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setInviteEmails(inviteEmails.filter((em) => em !== emailToRemove));
  };

  // 3. Submit Invites
  const handleSendInvites = async () => {
    if (!createdWorkspace) return;

    if (inviteEmails.length === 0) {
      // Nothing to send, go to confirmation
      setStep(3);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.batchInviteMembers(createdWorkspace.id, {
        emails: inviteEmails,
        role,
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch invites. You can skip and invite later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipInvites = () => {
    setStep(3);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#F8FAFC] select-none">
      <div className="w-full max-w-xl bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden p-8 sm:p-10 transition-all">
        {/* Header with Logo */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <FlowdeskLogo size="sm" />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Workspace' },
              { num: 2, label: 'Teammates' },
              { num: 3, label: 'Ready' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition',
                    step === s.num
                      ? 'bg-[#7B68EE] text-white shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={cn(
                    'text-xs hidden sm:inline font-semibold',
                    step === s.num ? 'text-slate-800' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
                {idx < 2 && <span className="text-slate-200 text-xs hidden sm:inline">/</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Inline Error */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {/* SCREEN 2: CREATE WORKSPACE (STEP 1) */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Create your workspace
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Workspaces are where your spaces, projects, lists, and tasks live. Choose a type that
                suits your goals.
              </p>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Technologies, Sarah's Studio, OpenSource Hub"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Choose Workspace Type
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Personal */}
                  <label
                    onClick={() => setType('PERSONAL')}
                    className={cn(
                      'p-4 rounded-2xl border cursor-pointer transition text-left relative flex flex-col justify-between h-full group',
                      type === 'PERSONAL'
                        ? 'border-emerald-500 bg-emerald-50/30 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    )}
                  >
                    <div>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition',
                          type === 'PERSONAL'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                        )}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Personal</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Single user, private focus & tasks
                      </div>
                    </div>
                    {type === 'PERSONAL' && (
                      <span className="mt-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Selected
                      </span>
                    )}
                  </label>

                  {/* Team */}
                  <label
                    onClick={() => setType('TEAM')}
                    className={cn(
                      'p-4 rounded-2xl border cursor-pointer transition text-left relative flex flex-col justify-between h-full group',
                      type === 'TEAM'
                        ? 'border-[#7B68EE] bg-purple-50/40 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    )}
                  >
                    <div>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition',
                          type === 'TEAM'
                            ? 'bg-purple-100 text-[#7B68EE]'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-purple-50 group-hover:text-[#7B68EE]'
                        )}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Team / Group</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Private, invite-only team collaboration
                      </div>
                    </div>
                    {type === 'TEAM' && (
                      <span className="mt-3 text-[10px] font-bold text-[#7B68EE] uppercase tracking-wider">
                        Selected
                      </span>
                    )}
                  </label>

                  {/* Community */}
                  <label
                    onClick={() => setType('COMMUNITY')}
                    className={cn(
                      'p-4 rounded-2xl border cursor-pointer transition text-left relative flex flex-col justify-between h-full group',
                      type === 'COMMUNITY'
                        ? 'border-sky-500 bg-sky-50/30 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    )}
                  >
                    <div>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition',
                          type === 'COMMUNITY'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600'
                        )}
                      >
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Community</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Open membership & public link
                      </div>
                    </div>
                    {type === 'COMMUNITY' && (
                      <span className="mt-3 text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                        Selected
                      </span>
                    )}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 py-3 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Workspace...' : 'Continue to Teammates'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* SCREEN 3: INVITE TEAMMATES (STEP 2) */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Invite teammates
                </h2>
                {createdWorkspace && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7B68EE] font-bold text-[10px] border border-purple-200/60 truncate max-w-44">
                    {createdWorkspace.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Work is better together. Add your teammates' emails to send invitations. You can also
                skip this step and invite anytime from Settings.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="colleague@company.com"
                      className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
                    />
                  </div>

                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Pending Invites Chip UI */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pending Invites ({inviteEmails.length})
                  </span>
                  {inviteEmails.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInviteEmails([])}
                      className="text-[10px] text-slate-400 hover:text-rose-500 transition"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {inviteEmails.length === 0 ? (
                  <div className="p-5 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                    No teammates added yet. Type an email above and press Add or Enter.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl max-h-40 overflow-y-auto">
                    {inviteEmails.map((em) => (
                      <div
                        key={em}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 font-medium shadow-2xs group"
                      >
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{em}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded font-mono">
                          {role.toLowerCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(em)}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendInvites}
                  disabled={isLoading}
                  className="w-full sm:flex-1 py-3 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>
                    {isLoading
                      ? 'Sending Invitations...'
                      : inviteEmails.length > 0
                      ? `Send ${inviteEmails.length} Invites & Continue`
                      : 'Continue'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSkipInvites}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition text-center"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: CONFIRMATION SCREEN (STEP 3) */}
        {step === 3 && createdWorkspace && (
          <div className="text-center py-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              You're all set!
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Your Flowdesk workspace has been initialized with ClickUp-style spaces, projects, custom
              board columns, and real-time collaboration.
            </p>

            {/* Summary Card */}
            <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Workspace</span>
                <span className="font-bold text-slate-800">{createdWorkspace.name}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Type</span>
                <span className="inline-flex items-center gap-1 font-semibold text-xs capitalize text-slate-700">
                  {createdWorkspace.type === 'PERSONAL' && <User className="w-3 h-3 text-emerald-600" />}
                  {createdWorkspace.type === 'COMMUNITY' && <Globe className="w-3 h-3 text-sky-600" />}
                  {createdWorkspace.type === 'TEAM' && <Users className="w-3 h-3 text-[#7B68EE]" />}
                  <span>{createdWorkspace.type.toLowerCase()}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Invitations</span>
                <span className="font-semibold text-slate-700">
                  {inviteEmails.length > 0 ? `${inviteEmails.length} dispatched` : 'None (solo mode)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Starter Spaces</span>
                <span className="font-bold text-[#7B68EE]">Ready & Configured</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onComplete(createdWorkspace)}
              className="w-full py-3.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Go to Workspace Dashboard</span>
              <Rocket className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
