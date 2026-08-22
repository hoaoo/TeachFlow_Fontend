'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken, getAccessToken, clearAuth, notifyAuthStateChanged } from '@/services/api-client';

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  teacher?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    phone?: string;
    classes?: Array<{
      id: string;
      name: string;
      grade: string;
      studentCount: number;
    }>;
  };
};

type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (input: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    const token = getAccessToken();
    if (!token) {
      // If no access token in memory/localStorage, attempt silent refresh using HttpOnly cookie
      try {
        const refreshBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');
        const refreshRes = await fetch(`${refreshBase}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken || refreshData.tokens?.accessToken;
          if (newToken) {
            setAccessToken(newToken);
            const userProfile = await api.get<UserProfile>('/auth/me');
            setUser(userProfile);
            setIsLoading(false);
            return userProfile;
          }
        }
      } catch {
        // Silent refresh failed -> unauthenticated
      }

      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const data = await api.get<UserProfile>('/auth/me');
      setUser(data);
      return data;
    } catch {
      setUser(null);
      clearAuth();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    // Listen for successful login/auth-state-changed (re-fetch profile)
    const handleAuthChange = () => {
      fetchProfile();
    };

    // Listen for session-cleared (logout or token refresh failure): just clear user, no re-fetch
    const handleAuthCleared = () => {
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener('teachflow:auth-state-changed', handleAuthChange);
    window.addEventListener('teachflow:auth-cleared', handleAuthCleared);
    return () => {
      window.removeEventListener('teachflow:auth-state-changed', handleAuthChange);
      window.removeEventListener('teachflow:auth-cleared', handleAuthCleared);
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const data = await api.post<{
        user: any;
        tokens?: { accessToken: string };
        accessToken?: string;
      }>('/auth/login', { email: email.trim().toLowerCase(), password });

      const token = data.accessToken || data.tokens?.accessToken;
      if (token) {
        setAccessToken(token);
      }
      const profile = await fetchProfile();
      if (!profile) throw new Error('Không thể tải thông tin tài khoản sau đăng nhập.');
      // Notify data loaders (Dashboard, Sidebar, etc.) to reload after successful login
      notifyAuthStateChanged();
      return profile;
  };

  const register = async (input: { fullName: string; email: string; password: string }) => {
    await api.post('/auth/register', {
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuth();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
