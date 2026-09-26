'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register({ email, password, name });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setError('');
    try {
      await login({ email: demoEmail, password: 'Password123!' });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] select-none">
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#7B68EE] text-white shadow-md shadow-purple-500/20 mb-3">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M4 14.5L12 6.5L20 14.5L17.5 17L12 11.5L6.5 17L4 14.5Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Click<span className="text-[#7B68EE]">Up</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clean, light, minimal team task management
          </p>
        </div>

        {/* 1-Click Demo Accounts */}
        <div className="mb-6 p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7B68EE] uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Accounts (Click to log in)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@acme.com')}
              className="text-left p-2 rounded-xl bg-white border border-slate-200/80 hover:border-[#7B68EE] transition text-[11px] shadow-2xs"
            >
              <div className="font-bold text-slate-800 truncate">Sarah Connor</div>
              <div className="text-[10px] text-[#7B68EE] font-semibold">Admin Role</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager@acme.com')}
              className="text-left p-2 rounded-xl bg-white border border-slate-200/80 hover:border-[#7B68EE] transition text-[11px] shadow-2xs"
            >
              <div className="font-bold text-slate-800 truncate">Alex Rivera</div>
              <div className="text-[10px] text-amber-500 font-semibold">Manager Role</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('priya@acme.com')}
              className="text-left p-2 rounded-xl bg-white border border-slate-200/80 hover:border-[#7B68EE] transition text-[11px] shadow-2xs"
            >
              <div className="font-bold text-slate-800 truncate">Priya Patel</div>
              <div className="text-[10px] text-slate-400 font-medium">Product / Member</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('david@acme.com')}
              className="text-left p-2 rounded-xl bg-white border border-slate-200/80 hover:border-[#7B68EE] transition text-[11px] shadow-2xs"
            >
              <div className="font-bold text-slate-800 truncate">David Chen</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Tech Lead</div>
            </button>
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              !isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Connor"
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-[#7B68EE]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-[#7B68EE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-[#7B68EE]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Processing...' : isRegister ? 'Get Started Free' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
