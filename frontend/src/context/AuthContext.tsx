'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { User, Workspace } from '../types';

interface AuthContextType {
  user: User | null;
  workspaces: any[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role?: string }) => Promise<void>;
  logout: () => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('task_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
        setWorkspaces(res.user.workspaces || []);

        const savedWsId = localStorage.getItem('task_active_workspace_id');
        let currentWs = res.user.workspaces?.find((w: any) => w.workspaceId === savedWsId || w.id === savedWsId);

        if (!currentWs && res.user.workspaces?.length > 0) {
          currentWs = res.user.workspaces[0];
        }

        if (currentWs) {
          // Fetch full workspace details
          try {
            const wsDetail = await api.getWorkspace(currentWs.workspaceId || currentWs.id);
            setActiveWorkspaceState(wsDetail.workspace);
          } catch {
            setActiveWorkspaceState(currentWs);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load user session:', error);
      localStorage.removeItem('task_access_token');
      localStorage.removeItem('task_refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      localStorage.setItem('task_access_token', res.tokens.accessToken);
      localStorage.setItem('task_refresh_token', res.tokens.refreshToken);
      setUser(res.user);
      setWorkspaces(res.user.workspaces || []);

      if (res.user.workspaces?.length > 0) {
        const first = res.user.workspaces[0];
        localStorage.setItem('task_active_workspace_id', first.workspaceId || first.id);
        const wsDetail = await api.getWorkspace(first.workspaceId || first.id);
        setActiveWorkspaceState(wsDetail.workspace);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; name: string; role?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      localStorage.setItem('task_access_token', res.tokens.accessToken);
      localStorage.setItem('task_refresh_token', res.tokens.refreshToken);
      setUser(res.user);
      if (res.defaultWorkspace) {
        localStorage.setItem('task_active_workspace_id', res.defaultWorkspace.id);
        setActiveWorkspaceState(res.defaultWorkspace);
        setWorkspaces([res.defaultWorkspace]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('task_access_token');
    localStorage.removeItem('task_refresh_token');
    localStorage.removeItem('task_active_workspace_id');
    setUser(null);
    setActiveWorkspaceState(null);
    setWorkspaces([]);
  };

  const setActiveWorkspace = async (workspace: Workspace) => {
    localStorage.setItem('task_active_workspace_id', workspace.id);
    try {
      const wsDetail = await api.getWorkspace(workspace.id);
      setActiveWorkspaceState(wsDetail.workspace);
    } catch {
      setActiveWorkspaceState(workspace);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        isLoading,
        login,
        register,
        logout,
        setActiveWorkspace,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
