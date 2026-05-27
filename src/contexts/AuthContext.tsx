import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '@/services/authService';

export interface Login2FARequired { requires2FA: true; tempToken: string }

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Login2FARequired | void>;
  loginWith2FA: (tempToken: string, totpToken: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setIsLoading(false);
      return;
    }
    authService.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('novux_access_token');
        localStorage.removeItem('novux_refresh_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Login2FARequired | void> => {
    const result = await authService.login(email, password);
    if ('requires2FA' in result) return result;
    setUser(result);
  }, []);

  const loginWith2FA = useCallback(async (tempToken: string, totpToken: string) => {
    const u = await authService.loginWith2FA(tempToken, totpToken);
    setUser(u);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const u = await authService.loginWithGoogle(credential);
    setUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const u = await authService.register(name, email, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginWith2FA,
      loginWithGoogle,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
