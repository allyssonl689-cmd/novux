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

const SESSION_KEY = 'novux_session';

function saveSession(user: AuthUser) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
function loadSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Hidrata imediatamente do sessionStorage — evita flash para /login no reload
  const cached = loadSession();
  const [user, setUser] = useState<AuthUser | null>(cached);
  // Se há sessão em cache, começa sem loading (app abre diretamente)
  // e valida o token em background. Se não há cache, bloqueia até confirmar.
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    // Sempre tenta restaurar a sessão via cookie HttpOnly para obter um access token válido
    const timeout = setTimeout(() => {
      // Timeout de segurança: se o backend demorar muito (cold start Render),
      // não trava a UI. Com cache, o usuário já está na app; sem cache, vai ao login.
      setIsLoading(false);
    }, 20_000);

    authService.tryRestoreSession()
      .then(restored => {
        if (restored) {
          setUser(restored);
          saveSession(restored);
        } else {
          // Refresh falhou — sessão expirada ou inválida
          clearSession();
          setUser(null);
        }
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setIsLoading(false);
      });

    return () => clearTimeout(timeout);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Login2FARequired | void> => {
    const result = await authService.login(email, password);
    if ('requires2FA' in result) return result;
    setUser(result);
    saveSession(result);
  }, []);

  const loginWith2FA = useCallback(async (tempToken: string, totpToken: string) => {
    const u = await authService.loginWith2FA(tempToken, totpToken);
    setUser(u);
    saveSession(u);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const u = await authService.loginWithGoogle(credential);
    setUser(u);
    saveSession(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const u = await authService.register(name, email, password);
    setUser(u);
    saveSession(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
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
