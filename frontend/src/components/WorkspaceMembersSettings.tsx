'use client';

import React, { useState, useEffect } from 'react';
import { Workspace, WorkspaceMember, WorkspaceInvitation, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Users,
  Mail,
  Plus,
  X,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Trash2,
  Clock,
  Search,
  AlertCircle,
  CheckCircle2,
  Crown,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface WorkspaceMembersSettingsProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  onWorkspaceUpdated?: (updated: Workspace) => void;
  onRefreshMembers?: () => void;
}

interface QueuedInvite {
  email: string;
  role: Role;
}

export const WorkspaceMembersSettings: React.FC<WorkspaceMembersSettingsProps> = ({
  workspace,
  members: initialMembers,
  onWorkspaceUpdated,
  onRefreshMembers,
}) => {
  const { user } = useAuth();

  // Local state for workspace, members, and invitations
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(workspace);
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>(workspace.invitations || []);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Section 1: Invite by Email state
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('MEMBER');
  const [queuedInvites, setQueuedInvites] = useState<QueuedInvite[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Section 2: Shareable link state
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegeneratingLink, setIsRegeneratingLink] = useState(false);
  const [isTogglingLinkPolicy, setIsTogglingLinkPolicy] = useState(false);

  // Section 3: Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'members' | 'pending'>('all');
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Determine current user's role in this workspace
  const currentUserMembership = members.find((m) => m.userId === user?.id);
  const userRole: Role =
    currentUserMembership?.role ||
    (workspace.ownerId === user?.id ? 'ADMIN' : 'MEMBER');

  const isAdmin = userRole === 'ADMIN' || user?.role === 'ADMIN';
  const isManager = userRole === 'MANAGER';
  const canManageInvites = isAdmin || isManager;
  const canManageRoles = isAdmin;

  // Refresh workspace and invitations from API
  const refreshWorkspaceData = async () => {
    try {
      const res = await api.getWorkspace(workspace.id);
      if (res?.workspace) {
        setCurrentWorkspace(res.workspace);
        if (res.workspace.members) setMembers(res.workspace.members);
        if (res.workspace.invitations) setInvitations(res.workspace.invitations);
        if (onWorkspaceUpdated) onWorkspaceUpdated(res.workspace);
      }
    } catch (err) {
      console.error('Failed to reload workspace data:', err);
    }
  };

  useEffect(() => {
    setCurrentWorkspace(workspace);
    setMembers(initialMembers);
    if (workspace.invitations) {
      setInvitations(workspace.invitations);
    } else {
      refreshWorkspaceData();
    }
  }, [workspace.id, initialMembers]);

  // Count active Admins to enforce only-admin rule
  const adminCount = members.filter((m) => m.role === 'ADMIN').length;

  // SECTION 1: QUEUE & DISPATCH INVITES
  const handleAddInviteToQueue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();

    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      addToast('error', 'Please enter a valid email address');
      return;
    }

    // Check if already in queued chip list
    if (queuedInvites.some((i) => i.email === trimmed)) {
      addToast('info', `${trimmed} is already in the invitation queue`);
      return;
    }

    // Check if already an existing member
    if (members.some((m) => m.user?.email?.toLowerCase() === trimmed)) {
      addToast('error', `${trimmed} is already an active member of this workspace`);
      return;
    }

    // Check if pending invite already exists
    if (invitations.some((inv) => inv.email.toLowerCase() === trimmed && inv.status === 'PENDING')) {
      addToast('info', `A pending invitation has already been sent to ${trimmed}`);
      return;
    }

    setQueuedInvites((prev) => [...prev, { email: trimmed, role: selectedRole }]);
    setEmailInput('');
  };

  const handleRemoveFromQueue = (email: string) => {
    setQueuedInvites((prev) => prev.filter((i) => i.email !== email));
  };

  const handleSendQueuedInvites = async () => {
    if (queuedInvites.length === 0) return;

    setIsSendingInvites(true);
    try {
      const res = await api.batchInviteMembers(currentWorkspace.id, {
        invites: queuedInvites,
      });

      addToast(
        'success',
        `Successfully sent ${queuedInvites.length} invitation${queuedInvites.length > 1 ? 's' : ''}!`
      );
      setQueuedInvites([]);
      await refreshWorkspaceData();
      if (onRefreshMembers) onRefreshMembers();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to dispatch invitations');
    } finally {
      setIsSendingInvites(false);
    }
  };

  // SECTION 2: SHAREABLE INVITE LINK
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableJoinLink = currentWorkspace.inviteCode
    ? `${origin}/invite/${currentWorkspace.inviteCode}`
    : `${origin}/invite/${currentWorkspace.slug}`;

  const isShareableLinkActive =
    currentWorkspace.type === 'COMMUNITY' ||
    currentWorkspace.joinPolicy === 'PUBLIC_LINK';

  const handleCopyLink = () => {
    if (!isShareableLinkActive) return;
    navigator.clipboard.writeText(shareableJoinLink);
    setCopiedLink(true);
    addToast('success', 'Shareable invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleJoinPolicy = async () => {
    if (!isAdmin) return;
    setIsTogglingLinkPolicy(true);

    const newPolicy =
      currentWorkspace.joinPolicy === 'PUBLIC_LINK' ? 'INVITE_ONLY' : 'PUBLIC_LINK';

    try {
      const res = await api.updateWorkspace(currentWorkspace.id, {
        joinPolicy: newPolicy,
      });

      setCurrentWorkspace(res.workspace);
      addToast(
        'success',
        newPolicy === 'PUBLIC_LINK'
          ? 'Shareable join link enabled for anyone with the link'
          : 'Shareable join link disabled. Workspace is now invite-only'
      );
      if (onWorkspaceUpdated) onWorkspaceUpdated(res.workspace);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update workspace join policy');
    } finally {
      setIsTogglingLinkPolicy(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!isAdmin) return;
    if (
      !confirm(
        'Are you sure you want to regenerate the shareable link? Any previous link sent will immediately become invalid.'
      )
    ) {
      return;
    }

    setIsRegeneratingLink(true);
    try {
      const res = await api.regenerateInviteCode(currentWorkspace.id);
      setCurrentWorkspace(res.workspace);
      addToast('success', 'New shareable invite link generated! Old links are now invalid.');
      if (onWorkspaceUpdated) onWorkspaceUpdated(res.workspace);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to regenerate invite link');
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  // SECTION 3: MEMBERS & PENDING INVITES ACTIONS
  const handleRoleChange = async (memberId: string, memberName: string, newRole: Role) => {
    if (!isAdmin) return;

    try {
      await api.updateMemberRole(currentWorkspace.id, memberId, newRole);
      addToast('success', `Updated ${memberName}'s role to ${newRole}`);
      await refreshWorkspaceData();
      if (onRefreshMembers) onRefreshMembers();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update member role');
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !isAdmin) return;

    setIsRemovingMember(true);
    try {
      await api.removeMember(currentWorkspace.id, memberToRemove.userId);
      addToast('info', `${memberToRemove.user?.name || 'Member'} was removed from the workspace`);
      setMemberToRemove(null);
      await refreshWorkspaceData();
      if (onRefreshMembers) onRefreshMembers();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to remove member');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleRevokeInvitation = async (inviteId: string, email: string) => {
    if (!canManageInvites) return;

    try {
      await api.revokeInvitation(currentWorkspace.id, inviteId);
      addToast('info', `Invitation for ${email} has been revoked`);
      setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      addToast('error', err.message || 'Failed to revoke invitation');
    }
  };

  // Filtering
  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q)
    );
  });

  const pendingInvites = invitations.filter((i) => i.status === 'PENDING');
  const filteredPendingInvites = pendingInvites.filter((i) => {
    if (!searchQuery) return true;
    return i.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-slideUp transition',
              toast.type === 'success' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
              toast.type === 'error' && 'bg-rose-50 text-rose-800 border-rose-200',
              toast.type === 'info' && 'bg-slate-900 text-white border-slate-800'
            )}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {toast.type === 'info' && <Sparkles className="w-4 h-4 text-[#7B68EE] shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:opacity-70 transition rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Access Permission Banner for standard Members */}
      {!canManageInvites && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You have <strong>View-only</strong> access to this workspace. Only Admins and Managers can invite teammates or adjust member roles.
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: INVITE BY EMAIL (Admin & Manager only)       */}
      {/* ======================================================== */}
      {canManageInvites && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#7B68EE] flex items-center justify-center font-bold text-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  1. Invite Teammates by Email
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-9">
                Queue multiple email invitations with assigned permissions before sending.
              </p>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 pl-9 sm:pl-0">
              Role: <strong className="text-slate-700 capitalize">{userRole.toLowerCase()}</strong>
            </span>
          </div>

          {/* Form to Queue Invite */}
          <form onSubmit={handleAddInviteToQueue} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Email Input */}
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-base sm:text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
                />
              </div>

              {/* Role Picker */}
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] cursor-pointer"
                >
                  <option value="MEMBER">Member (Task collaboration)</option>
                  <option value="MANAGER">Manager (Spaces & invites)</option>
                  {isAdmin && <option value="ADMIN">Admin (Full workspace control)</option>}
                </select>

                {/* Add to Queue Button */}
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Queue</span>
                </button>
              </div>
            </div>
          </form>

          {/* Queued Invites Chip List */}
          {queuedInvites.length > 0 && (
            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600 uppercase tracking-wider">
                  Pending Dispatch Queue ({queuedInvites.length})
                </span>
                <button
                  type="button"
                  onClick={() => setQueuedInvites([])}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  Clear Queue
                </button>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {queuedInvites.map((item) => (
                  <div
                    key={item.email}
                    className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs text-xs font-medium text-slate-800 animate-scaleUp"
                  >
                    <span className="font-mono text-[11px]">{item.email}</span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider',
                        item.role === 'ADMIN' && 'bg-purple-100 text-[#7B68EE]',
                        item.role === 'MANAGER' && 'bg-amber-100 text-amber-800',
                        item.role === 'MEMBER' && 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {item.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromQueue(item.email)}
                      className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Dispatch Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isSendingInvites}
                  onClick={handleSendQueuedInvites}
                  className="px-5 py-2 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSendingInvites ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Sending invitations...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send {queuedInvites.length} Invitation{queuedInvites.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: SHAREABLE INVITE LINK                         */}
      {/* ======================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                <LinkIcon className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                2. Shareable Workspace Join Link
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-9">
              A persistent link allowing eligible members to join directly with a single click.
            </p>
          </div>

          {/* Status Badge */}
          <div className="pl-9 sm:pl-0 flex items-center gap-2">
            {isShareableLinkActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Public Link Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">
                <Lock className="w-3 h-3 text-slate-400" />
                Invite-Only Protected
              </span>
            )}
          </div>
        </div>

        {/* Link Controller by Workspace Type */}
        {currentWorkspace.type === 'PERSONAL' ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Personal workspaces are private to a single user. To collaborate with a team, create a Team workspace.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle Switch for Team Workspaces */}
            {currentWorkspace.type === 'TEAM' && isAdmin && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Enable Shareable Public Join Link
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    When enabled, anyone with this link can immediately join as a Member.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleJoinPolicy}
                  disabled={isTogglingLinkPolicy}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    isShareableLinkActive ? 'bg-[#7B68EE]' : 'bg-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      isShareableLinkActive ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            )}

            {/* Active Link Box */}
            {isShareableLinkActive ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 truncate select-all">
                    {shareableJoinLink}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-2.5 rounded-xl bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleRegenerateLink}
                        disabled={isRegeneratingLink}
                        title="Invalidates previous link and creates a fresh link"
                        className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isRegeneratingLink && 'animate-spin')} />
                        <span className="hidden sm:inline">Regenerate</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Regenerating the link immediately invalidates the previous invite code.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
                Shareable link joining is currently disabled. Teammates can only join when invited directly by email above.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: MEMBERS & PENDING INVITES LIST                */}
      {/* ======================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                3. Members & Pending Invites
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-9">
              Manage permission levels, view team status, and revoke pending invitations.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative pl-9 sm:pl-0 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter members or invites..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-1 focus:ring-[#7B68EE]"
            />
          </div>
        </div>

        {/* View Tabs: All / Members / Pending */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
              activeTab === 'all'
                ? 'bg-purple-50 text-[#7B68EE]'
                : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            All ({members.length + pendingInvites.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
              activeTab === 'members'
                ? 'bg-purple-50 text-[#7B68EE]'
                : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            Active Members ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
              activeTab === 'pending'
                ? 'bg-purple-50 text-[#7B68EE]'
                : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            Pending Invites ({pendingInvites.length})
          </button>
        </div>

        {/* Active Members Table */}
        {(activeTab === 'all' || activeTab === 'members') && (
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Active Workspace Members ({filteredMembers.length})
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-2xl overflow-hidden bg-white">
              {filteredMembers.map((m) => {
                const isWorkspaceOwner = currentWorkspace.ownerId === m.userId;
                const isSelf = user?.id === m.userId;
                const isTargetAdmin = m.role === 'ADMIN';
                const canModifyThisMember =
                  isAdmin && !isWorkspaceOwner && !(isTargetAdmin && adminCount <= 1);

                return (
                  <div
                    key={m.userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50/60 transition gap-2 sm:gap-4"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {m.user?.avatarUrl ? (
                        <img
                          src={m.user.avatarUrl}
                          alt={m.user.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#7B68EE] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {m.user?.name?.charAt(0) || 'U'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {m.user?.name || 'Unnamed User'}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-[#7B68EE] text-[9px] font-bold">
                              You
                            </span>
                          )}
                          {isWorkspaceOwner && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold">
                              <Crown className="w-2.5 h-2.5" />
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {m.user?.email}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Role Selector & Remove */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Role Selector */}
                      {isAdmin ? (
                        <select
                          disabled={!canModifyThisMember}
                          value={m.role}
                          onChange={(e) =>
                            handleRoleChange(m.userId, m.user?.name || 'Member', e.target.value as Role)
                          }
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none transition',
                            !canModifyThisMember && 'opacity-60 cursor-not-allowed bg-slate-100'
                          )}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-lg border',
                            m.role === 'ADMIN' && 'bg-purple-50 text-[#7B68EE] border-purple-200',
                            m.role === 'MANAGER' && 'bg-amber-50 text-amber-700 border-amber-200',
                            m.role === 'MEMBER' && 'bg-slate-50 text-slate-600 border-slate-200'
                          )}
                        >
                          {m.role}
                        </span>
                      )}

                      {/* Remove Button */}
                      {isAdmin && (
                        <button
                          type="button"
                          disabled={!canModifyThisMember}
                          onClick={() => setMemberToRemove(m)}
                          title={
                            isWorkspaceOwner
                              ? 'Workspace owner cannot be removed'
                              : isTargetAdmin && adminCount <= 1
                              ? 'Cannot remove the only Admin'
                              : 'Remove member from workspace'
                          }
                          className={cn(
                            'p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition',
                            !canModifyThisMember && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-400'
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No matching workspace members found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Invitations Table */}
        {(activeTab === 'all' || activeTab === 'pending') && (
          <div className="space-y-2 pt-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Pending Invitations ({filteredPendingInvites.length})
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-2xl overflow-hidden bg-white">
              {filteredPendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50/60 transition gap-2 sm:gap-4"
                >
                  {/* Email & Status */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 truncate font-mono">
                          {invite.email}
                        </span>
                        <span className="px-2 py-0.2 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/60">
                          Pending
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Invited as <strong className="text-slate-600">{invite.role}</strong> • Link active
                      </div>
                    </div>
                  </div>

                  {/* Actions: Revoke */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {canManageInvites && (
                      <button
                        type="button"
                        onClick={() => handleRevokeInvitation(invite.id, invite.email)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredPendingInvites.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No pending invitations
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Removing Member */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Remove Member?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{memberToRemove.user?.name}</strong> (
                {memberToRemove.user?.email}) from this workspace? They will lose access to all projects and tasks.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemovingMember}
                onClick={handleConfirmRemoveMember}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isRemovingMember ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
