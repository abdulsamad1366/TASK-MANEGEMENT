'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { AuthScreen } from '../../../components/AuthScreen';
import { FlowdeskLogo } from '../../../components/FlowdeskLogo';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  LogOut,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function JoinWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user, refreshUser, logout, isLoading: isAuthLoading } = useAuth();

  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Join Request state
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'ALREADY_MEMBER' | 'APPROVED'>('IDLE');
  const [requestDetails, setRequestDetails] = useState<any>(null);

  // 1. Fetch workspace public preview info
  useEffect(() => {
    if (!slug) return;
    loadWorkspaceInfo();
  }, [slug]);

  const loadWorkspaceInfo = async () => {
    setIsLoadingWorkspace(true);
    setErrorMessage('');
    try {
      const res = await api.getJoinInfo(slug);
      setWorkspace(res.workspace);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'This invite link is no longer valid or does not exist.'
      );
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  // 2. Automatically submit join request once user is logged in
  useEffect(() => {
    if (user && workspace && !isAuthLoading && requestStatus === 'IDLE') {
      submitJoinRequest();
    }
  }, [user, workspace, isAuthLoading]);

  const submitJoinRequest = async () => {
    if (!slug) return;
    setIsSubmittingRequest(true);
    try {
      const res = await api.requestToJoin(slug);

      if (res.alreadyMember) {
        setRequestStatus('ALREADY_MEMBER');
        await refreshUser();
        setTimeout(() => {
          router.push('/');
        }, 1200);
      } else if (res.status === 'PENDING' || res.alreadyRequested) {
        setRequestStatus('PENDING');
        setRequestDetails(res.request);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit join request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Check if approved on manual refresh
  const handleCheckStatus = async () => {
    await submitJoinRequest();
  };

  // Loading state
  if (isLoadingWorkspace || isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#7B68EE] border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading workspace link...</span>
        </div>
      </div>
    );
  }

  // Link Invalid or Expired state
  if (errorMessage && !workspace) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 text-center shadow-xl space-y-4 animate-scaleUp">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/60">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              {errorMessage.toLowerCase().includes('not enabled') || errorMessage.toLowerCase().includes('disabled')
                ? 'Join Link Disabled by Owner'
                : 'This invite link is no longer valid'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 rounded-xl bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold transition shadow-xs"
            >
              Go to Flowdesk Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: User is NOT logged in → Show Sign Up / Log In with pre-context header
  if (!user) {
    return (
      <div className="relative">
        <AuthScreen
          workspaceName={workspace?.name}
          onLoginSuccess={() => {
            // useEffect will trigger submitJoinRequest once user state is populated
          }}
          onSignupSuccess={() => {
            // useEffect will trigger submitJoinRequest once user state is populated
          }}
        />
      </div>
    );
  }

  // Step 3A: Already a member
  if (requestStatus === 'ALREADY_MEMBER') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 text-center shadow-xl space-y-4 animate-scaleUp">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/60">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Already a Member!</h2>
            <p className="text-xs text-slate-500 mt-1">
              You already belong to <strong>{workspace?.name}</strong>. Redirecting you to the dashboard...
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 rounded-xl bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3B: Request sent — waiting for approval
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-scaleUp">
        {/* Flowdesk Logo */}
        <div className="flex justify-center">
          <FlowdeskLogo size="md" />
        </div>

        {/* Animated Clock / Hourglass Badge */}
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-purple-50 text-[#7B68EE] border border-purple-200/70 flex items-center justify-center shadow-2xs">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        {/* Header Content */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Request sent — waiting for approval
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            Your request to join <strong className="text-slate-800">{workspace?.name}</strong> has been sent to the workspace admins. You will receive an in-app notification as soon as your access is approved.
          </p>
        </div>

        {/* Workspace Card & Status Details */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-left space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {workspace?.logoUrl ? (
                <img
                  src={workspace.logoUrl}
                  alt={workspace.name}
                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#7B68EE] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {workspace?.name}
                </div>
                <div className="text-[11px] text-slate-400 capitalize">
                  {workspace?.type?.toLowerCase()} Workspace
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200/70 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Pending Approval
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Signed in as:</span>
            <span className="font-semibold text-slate-800 truncate max-w-45">
              {user.email}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isSubmittingRequest}
            onClick={handleCheckStatus}
            className="w-full py-2.5 rounded-xl bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSubmittingRequest && 'animate-spin')} />
            <span>Check Approval Status</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Go to My Workspaces
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3 h-3" />
            <span>Switch account / Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
