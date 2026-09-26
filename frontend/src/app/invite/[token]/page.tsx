'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { AuthScreen } from '../../../components/AuthScreen';
import { FlowdeskLogo } from '../../../components/FlowdeskLogo';
import {
  CheckCircle2,
  Users,
  User,
  Globe,
  AlertCircle,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { user, activeWorkspace, setActiveWorkspace, refreshUser, isLoading: isAuthLoading } =
    useAuth();

  const [invitationData, setInvitationData] = useState<any>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    setIsLoadingInvite(true);
    setInviteError('');
    try {
      const res = await api.getInvitation(token);
      setInvitationData(res);
    } catch (err: any) {
      setInviteError(err.message || 'Invitation not found or has expired');
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      const res = await api.acceptInvitation(token);
      setAcceptedSuccess(true);
      await refreshUser();
      if (res.workspace) {
        await setActiveWorkspace(res.workspace);
      }
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoadingInvite || isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#7B68EE] border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Verifying invitation...</span>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200/60">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Invitation Link Invalid</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            {inviteError}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl bg-[#7B68EE] text-white text-xs font-bold hover:bg-[#6C5CE7] transition"
          >
            Go to Flowdesk Home
          </button>
        </div>
      </div>
    );
  }

  const workspace = invitationData?.workspace;
  const invitation = invitationData?.invitation;

  // Case 1: If user is not authenticated, show AuthScreen with prefilled invited email
  if (!user) {
    return (
      <AuthScreen
        prefilledEmail={invitation?.email || ''}
        inviteToken={token}
        workspaceName={workspace?.name}
        onLoginSuccess={async () => {
          await refreshUser();
          router.push('/');
        }}
        onSignupSuccess={async () => {
          await refreshUser();
          router.push('/');
        }}
      />
    );
  }

  // Case 2: User is already logged in
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl text-center animate-fadeIn">
        <FlowdeskLogo size="lg" showText={false} className="mx-auto mb-4" />

        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#7B68EE] text-[11px] font-bold border border-purple-200/60 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Workspace Invitation
          </span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Join {workspace?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            You've been invited to collaborate as a{' '}
            <strong className="text-slate-800">{invitation?.role?.toLowerCase() || 'member'}</strong>.
          </p>
        </div>

        {/* Workspace Card preview */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Workspace</span>
            <span className="font-bold text-slate-800">{workspace?.name}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Type</span>
            <span className="inline-flex items-center gap-1 text-slate-700 font-semibold capitalize text-xs">
              {workspace?.type === 'PERSONAL' && <User className="w-3 h-3 text-emerald-600" />}
              {workspace?.type === 'COMMUNITY' && <Globe className="w-3 h-3 text-sky-600" />}
              {workspace?.type === 'TEAM' && <Users className="w-3 h-3 text-[#7B68EE]" />}
              <span>{workspace?.type?.toLowerCase() || 'team'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Invited Account</span>
            <span className="text-slate-600 font-mono text-[11px] truncate max-w-48">
              {user.email}
            </span>
          </div>
        </div>

        {acceptedSuccess ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Accepted! Redirecting to workspace...</span>
          </div>
        ) : (
          <button
            onClick={handleAcceptInvite}
            disabled={isAccepting}
            className="w-full py-3 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isAccepting ? 'Joining Workspace...' : 'Accept Invitation & Join'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
