'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Workspace, WorkspaceMember, Role } from '../types';
import { Building2, Users, Shield, Bell, Sun } from 'lucide-react';
import { WorkspaceMembersSettings } from './WorkspaceMembersSettings';

interface SettingsViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  initialTab?: 'workspace' | 'members' | 'personal';
  onWorkspaceUpdated?: (updated: Workspace) => void;
  onRefreshMembers?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  members,
  initialTab = 'workspace',
  onWorkspaceUpdated,
  onRefreshMembers,
}) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'workspace' | 'members' | 'personal'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Workspace form state
  const [name, setName] = useState(workspace.name || '');
  const [description, setDescription] = useState(workspace.description || '');
  const [isSavingWs, setIsSavingWs] = useState(false);
  const [wsMsg, setWsMsg] = useState('');

  // Personal form state
  const [userName, setUserName] = useState(user?.name || '');
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>(
    user?.notificationSettings || {
      assignments: true,
      mentions: true,
      comments: true,
      dueDates: true,
      email: true,
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
      setWsMsg('Workspace details updated successfully!');
      if (onWorkspaceUpdated) onWorkspaceUpdated(res.workspace);
    } catch (err: any) {
      setWsMsg('Error: ' + err.message);
    } finally {
      setIsSavingWs(false);
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    setPersonalMsg('');
    try {
      const res = await api.updateProfile({
        name: userName,
        notificationSettings: notifSettings,
      });
      updateUser(res.user);
      setPersonalMsg('Profile & notification preferences saved!');
    } catch (err: any) {
      setPersonalMsg('Error: ' + err.message);
    } finally {
      setIsSavingPersonal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16 animate-fadeIn select-none">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Settings & Team Management
        </h1>
        <p className="text-xs text-slate-400">
          Configure organization settings, team roles, and notification preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'workspace'
              ? 'bg-purple-50 text-[#7B68EE]'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'members'
              ? 'bg-purple-50 text-[#7B68EE]'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'personal'
              ? 'bg-purple-50 text-[#7B68EE]'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Profile & Notifications</span>
        </button>
      </div>

      {/* Tab 1: Workspace Settings */}
      {activeTab === 'workspace' && (
        <form
          onSubmit={handleSaveWorkspace}
          className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-4"
        >
          {wsMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">
              {wsMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-1 focus:ring-[#7B68EE]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-1 focus:ring-[#7B68EE] resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingWs}
              className="px-4 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              {isSavingWs ? 'Saving...' : 'Save Workspace'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Team Members & Invites */}
      {activeTab === 'members' && (
        <WorkspaceMembersSettings
          workspace={workspace}
          members={members}
          onWorkspaceUpdated={onWorkspaceUpdated}
          onRefreshMembers={onRefreshMembers}
        />
      )}

      {/* Tab 3: Personal Settings & Notification Preferences */}
      {activeTab === 'personal' && (
        <form
          onSubmit={handleSavePersonal}
          className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-5"
        >
          {personalMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">
              {personalMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-1 focus:ring-[#7B68EE]"
            />
          </div>

          {/* Theme Display (Light theme is default and only theme initially) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              UI Theme
            </label>
            <div className="flex items-center gap-2 p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl text-xs">
              <Sun className="w-4 h-4 text-[#7B68EE]" />
              <div className="flex-1">
                <span className="font-bold text-slate-800">Clean Light Minimal Theme</span>
                <p className="text-[11px] text-slate-500">
                  Official Flowdesk theme with generous whitespace, soft grays, and purple accents.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#7B68EE] border border-purple-200 shadow-xs">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
              <Bell className="w-3.5 h-3.5 text-[#7B68EE]" />
              Notification Preferences
            </label>

            <div className="space-y-2.5">
              {[
                { key: 'assignments', label: 'Task Assignments (When assigned to a task)' },
                { key: 'mentions', label: 'Mentions (When mentioned with @ in comments or chat)' },
                { key: 'comments', label: 'Task Comments (New messages in in-task chat)' },
                { key: 'dueDates', label: 'Due Date Reminders (Approaching task deadlines)' },
                { key: 'email', label: 'Send Email Digest & Notifications' },
              ].map((pref) => (
                <label key={pref.key} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(notifSettings[pref.key])}
                    onChange={(e) =>
                      setNotifSettings({
                        ...notifSettings,
                        [pref.key]: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-[#7B68EE] focus:ring-0 w-3.5 h-3.5"
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
              className="px-4 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              {isSavingPersonal ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
