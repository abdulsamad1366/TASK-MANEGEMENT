'use client';

import React, { useState } from 'react';
import api from '../lib/api';
import { Role } from '../types';
import { X, UserPlus, Copy, Check } from 'lucide-react';

interface InviteMemberModalProps {
  workspaceId: string;
  onClose: () => void;
  onMemberInvited?: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  workspaceId,
  onClose,
  onMemberInvited,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.inviteMember(workspaceId, { email: email.trim(), role });
      if (res.inviteLink) {
        setInviteLink(`${window.location.origin}${res.inviteLink}`);
      } else {
        alert(res.message || 'Member added!');
        if (onMemberInvited) onMemberInvited();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#7B68EE]" />
            <h2 className="text-sm font-bold text-slate-900">
              Invite Team Member
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {inviteLink ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                Invitation created! Share this link with your teammate to join:
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 select-all font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3.5 py-2 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-[#7B68EE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Role & Permissions
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-[#7B68EE]"
                >
                  <option value="MEMBER">Member (Can create, view, and comment on tasks)</option>
                  <option value="MANAGER">Manager (Can manage spaces, projects, and lists)</option>
                  <option value="ADMIN">Admin (Full administrative access and member billing)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-4 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Generating Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
