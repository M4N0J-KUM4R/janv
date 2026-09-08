'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { auth as authApi } from './api';
import type { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

function setTokens(access: string, refresh: string, persist: boolean) {
  const storage = persist ? localStorage : sessionStorage;
  storage.setItem('access_token', access);
  storage.setItem('refresh_token', refresh);
  // Clean up the other storage
  const other = persist ? sessionStorage : localStorage;
  other.removeItem('access_token');
  other.removeItem('refresh_token');
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      // Try refresh
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await authApi.refresh(refreshToken);
          // Determine which storage had the token
          const persist = !!localStorage.getItem('refresh_token');
          setTokens(res.access_token, refreshToken, persist);
          const u = await authApi.me();
          setUser(u);
        } catch {
          clearTokens();
        }
      } else {
        clearTokens();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchUser();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchUser]);

  const login = async (email: string, password: string, rememberMe = true): Promise<User> => {
    const res = await authApi.login(email, password);
    setTokens(res.access_token, res.refresh_token, rememberMe);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/adminLogin';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
