'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken, getAccessToken, clearAuth } from '@/services/api-client';

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get<UserProfile>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const handleAuthChange = () => {
      fetchProfile();
    };

    window.addEventListener('teachflow:auth-state-changed', handleAuthChange);
    return () => {
      window.removeEventListener('teachflow:auth-state-changed', handleAuthChange);
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{
        user: any;
        tokens: { accessToken: string; refreshToken: string };
      }>('/auth/login', { email, password });

      setAccessToken(data.tokens.accessToken);
      await fetchProfile();
    } finally {
      setIsLoading(false);
    }
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
