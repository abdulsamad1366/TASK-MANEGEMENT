import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User as UserIcon, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { FlowdeskLogo } from './FlowdeskLogo';

interface AuthScreenProps {
  onLoginSuccess?: (hasWorkspaces: boolean) => void;
  onSignupSuccess?: () => void;
  initialTab?: 'login' | 'signup';
  prefilledEmail?: string;
  inviteToken?: string;
  workspaceName?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onSignupSuccess,
  initialTab = 'login',
  prefilledEmail = '',
  inviteToken,
  workspaceName,
}) => {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (activeTab === 'signup') {
        const res = await register({
          email: email.trim(),
          password,
          name: name.trim(),
          inviteToken,
          createDefaultWorkspace: false, // User goes through onboarding wizard
        });

        if (onSignupSuccess) {
          onSignupSuccess();
        }
      } else {
        const res = await login({
          email: email.trim(),
          password,
          inviteToken,
        });

        const hasWorkspaces = res.user?.workspaces && res.user.workspaces.length > 0;
        if (onLoginSuccess) {
          onLoginSuccess(hasWorkspaces);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await login({ email: demoEmail, password: 'Password123!', inviteToken });
      const hasWorkspaces = res.user?.workspaces && res.user.workspaces.length > 0;
      if (onLoginSuccess) {
        onLoginSuccess(hasWorkspaces);
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 py-8 overflow-y-auto bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-9 my-auto transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <FlowdeskLogo size="xl" showText={false} className="mb-2.5" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Flow<span className="text-[#7B68EE]">desk</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {workspaceName
              ? `Join ${workspaceName} on Flowdesk`
              : 'Clean, light, minimal team task management'}
          </p>
        </div>

        {/* Tab Toggle: Log In vs Sign Up */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition min-h-[40px] ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition min-h-[40px] ${
              activeTab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Inline Error Message */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full text-base sm:text-xs pl-10 pr-3.5 py-3 sm:py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full text-base sm:text-xs pl-10 pr-3.5 py-3 sm:py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={activeTab === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-base sm:text-xs pl-10 pr-10 py-3 sm:py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-[#7B68EE]/20 focus:border-[#7B68EE] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 sm:py-3 bg-[#7B68EE] hover:bg-[#6C5CE7] active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[46px]"
          >
            <span>
              {isLoading
                ? 'Processing...'
                : activeTab === 'signup'
                ? 'Create Account & Continue'
                : 'Log In'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Instant Demo Accounts */}
        {!inviteToken && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7B68EE] uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant 1-Click Demo Logins</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@acme.com')}
                className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-[#7B68EE] transition text-[11px] shadow-2xs group"
              >
                <div className="font-bold text-slate-800 truncate group-hover:text-[#7B68EE]">
                  Sarah Connor
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Acme Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@acme.com')}
                className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-[#7B68EE] transition text-[11px] shadow-2xs group"
              >
                <div className="font-bold text-slate-800 truncate group-hover:text-[#7B68EE]">
                  Alex Rivera
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Product Manager</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
