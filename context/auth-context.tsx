'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthTokens, getAccessToken, clearAuthTokens, notifyAuthStateChanged, API_BASE_URL, fetchWithResilience } from '@/services/api-client';
import { getStoredRefreshToken, initializeTokenStorage } from '@/services/token-storage';

/** Mirror of api-client's logic: no cookies on Tauri WebView (tauri://localhost is not a whitelisted CORS credentialed origin). */
function resolveCredentials(): RequestCredentials {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? 'omit' : 'include';
}


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
    try {
      const token = getAccessToken();
      if (!token) {
        // Web uses its HttpOnly cookie; Desktop reads its refresh token from Windows secure storage.
        try {
          const refreshToken = await getStoredRefreshToken();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          try {
            const refreshRes = await fetchWithResilience(
              `${API_BASE_URL}/auth/refresh`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
                credentials: resolveCredentials(),
                signal: controller.signal,
              },
              false,
            );
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData.accessToken || refreshData.tokens?.accessToken;
              if (newToken) {
                await setAuthTokens(newToken, refreshData.refreshToken || refreshData.tokens?.refreshToken);
                const userProfile = await api.get<UserProfile>('/auth/me');
                setUser(userProfile);
                return userProfile;
              }
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch {
          // Silent refresh failed or timed out -> unauthenticated
        }

        setUser(null);
        return null;
      }

      try {
        const data = await api.get<UserProfile>('/auth/me');
        setUser(data);
        return data;
      } catch (error: any) {
        if (error?.statusCode === 401 || error?.code === 'UNAUTHORIZED') {
          setUser(null);
          await clearAuthTokens();
        }
        return null;
      }
    } catch (err) {
      console.error('[TeachFlow Auth] Unexpected error during fetchProfile:', err);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Safety guard: guarantee that isLoading is NEVER stuck forever
    const safetyTimer = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          console.warn('[TeachFlow Auth] Bootstrap safety timeout fired after 8s');
          return false;
        }
        return false;
      });
    }, 8000);

    initializeTokenStorage()
      .then(fetchProfile)
      .catch((err) => {
        console.error('[TeachFlow Auth] initializeTokenStorage failed:', err);
        setUser(null);
        setIsLoading(false);
      });

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
    window.addEventListener('online', handleAuthChange);
    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('teachflow:auth-state-changed', handleAuthChange);
      window.removeEventListener('teachflow:auth-cleared', handleAuthCleared);
      window.removeEventListener('online', handleAuthChange);
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const data = await api.post<{
        user: any;
        tokens?: { accessToken: string; refreshToken?: string };
        accessToken?: string;
        refreshToken?: string;
      }>('/auth/login', { email: email.trim().toLowerCase(), password });

      const token = data.accessToken || data.tokens?.accessToken;
      if (token) {
        await setAuthTokens(token, data.refreshToken || data.tokens?.refreshToken);
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
      const refreshToken = await getStoredRefreshToken();
      await api.post('/auth/logout', refreshToken ? { refreshToken } : undefined);
    } catch {
      // Ignore network errors during logout
    } finally {
      await clearAuthTokens();
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
