'use client';

import React, { useState } from 'react';
import api from '../lib/api';
import { Workspace, WorkspaceMember, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Building2, Users, Bell, Palette, Shield, Trash2, Check } from 'lucide-react';

interface SettingsViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  onWorkspaceUpdated: (updated: Workspace) => void;
  onRefreshMembers: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  members,
  onWorkspaceUpdated,
  onRefreshMembers,
}) => {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'workspace' | 'members' | 'personal'>('workspace');

  // Workspace form
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [isSavingWs, setIsSavingWs] = useState(false);
  const [wsMsg, setWsMsg] = useState('');

  // Personal form
  const [userName, setUserName] = useState(user?.name || '');
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>(
    user?.notificationSettings || {
      email: true,
      assignments: true,
      comments: true,
      mentions: true,
      dueDates: true,
    }
  );
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalMsg, setPersonalMsg] = useState('');

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWs(true);
    setWsMsg('');
    try {
      const res = await api.updateWorkspace(workspace.id, { name, description });
      onWorkspaceUpdated(res.workspace);
      setWsMsg('Workspace updated successfully!');
      setTimeout(() => setWsMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update workspace');
    } finally {
      setIsSavingWs(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    try {
      await api.updateMemberRole(workspace.id, memberId, newRole);
      onRefreshMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member from the workspace?')) {
      try {
        await api.removeMember(workspace.id, memberId);
        onRefreshMembers();
      } catch (err: any) {
        alert(err.message || 'Failed to remove member');
      }
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    setPersonalMsg('');
    try {
      await api.updateProfile({
        name: userName,
        notificationSettings: notifSettings,
      });
      await refreshUser();
      setPersonalMsg('Personal settings updated!');
      setTimeout(() => setPersonalMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update personal profile');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Settings & Team Management
        </h1>
        <p className="text-xs text-slate-400">
          Configure organization settings, team permissions, and personal preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'workspace'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'members'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'personal'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Profile & Preferences</span>
        </button>
      </div>

      {/* Tab 1: Workspace Settings */}
      {activeTab === 'workspace' && (
        <form
          onSubmit={handleSaveWorkspace}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          {wsMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium">
              {wsMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingWs}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              {isSavingWs ? 'Saving...' : 'Save Workspace'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Team Members & Roles */}
      {activeTab === 'members' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="text-xs text-slate-400 mb-2">
            Manage your team members and their permission levels (Admin, Manager, Member).
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      m.user.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        m.user.name
                      )}`
                    }
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {m.user.name}
                    </div>
                    <div className="text-xs text-slate-400">{m.user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    title="Remove Member"
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Personal Settings & Notification Preferences */}
      {activeTab === 'personal' && (
        <form
          onSubmit={handleSavePersonal}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
        >
          {personalMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium">
              {personalMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Theme Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Appearance Theme
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <span>Dark Theme (Linear / ClickUp style)</span>
                {theme === 'dark' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <span>Light Theme</span>
                {theme === 'light' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Notification Preferences
            </label>

            <div className="space-y-3">
              {[
                { key: 'assignments', label: 'Task Assignments (When assigned to a task)' },
                { key: 'mentions', label: 'Mentions (When mentioned with @ in comments)' },
                { key: 'comments', label: 'Task Comments (Comments on tasks you are assigned to)' },
                { key: 'dueDates', label: 'Due Date Reminders (Approaching deadlines)' },
                { key: 'email', label: 'Send Email Digest & Notifications' },
              ].map((pref) => (
                <label key={pref.key} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(notifSettings[pref.key])}
                    onChange={(e) =>
                      setNotifSettings({
                        ...notifSettings,
                        [pref.key]: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>{pref.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingPersonal}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              {isSavingPersonal ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
