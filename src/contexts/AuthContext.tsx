import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '@/services/authService';
import { AuthExpiredError } from '@/services/api';

export interface Login2FARequired { requires2FA: true; tempToken: string }

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tokenReady: boolean; // true após refreshAccessToken completar — FinanceContext aguarda isso
  login: (email: string, password: string) => Promise<Login2FARequired | AuthUser>;
  loginWith2FA: (tempToken: string, totpToken: string) => Promise<AuthUser>;
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
  const [isLoading, setIsLoading] = useState(!cached);
  // tokenReady: false até refreshAccessToken completar (evita fetch sem token)
  // Começa true somente se já há token em memória (ex: login fresh na mesma sessão)
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    // Timeout de segurança: 8s é suficiente para cold start normal do Render
    // Se ultrapassar, libera a UI sem travar o usuário
    const timeout = setTimeout(() => { setIsLoading(false); }, 8_000);

    authService.tryRestoreSession()
      .then(restored => {
        if (restored) {
          setUser(restored);
          saveSession(restored);
        } else {
          // Sem cookie ou cookie inválido → desloga
          clearSession();
          setUser(null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof AuthExpiredError) {
          // 401 definitivo: token expirado ou revogado → desloga
          clearSession();
          setUser(null);
        }
        // Erro de rede (backend offline/hibernando): mantém sessão em cache.
        // O usuário continua na app; o token será renovado na próxima chamada API.
      })
      .finally(() => {
        clearTimeout(timeout);
        setIsLoading(false);
        setTokenReady(true); // access token renovado (ou tentativa concluída)
      });

    return () => clearTimeout(timeout);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Login2FARequired | AuthUser> => {
    const result = await authService.login(email, password);
    if ('requires2FA' in result) return result;
    setUser(result);
    saveSession(result);
    setTokenReady(true);
    return result;
  }, []);

  const loginWith2FA = useCallback(async (tempToken: string, totpToken: string): Promise<AuthUser> => {
    const u = await authService.loginWith2FA(tempToken, totpToken);
    setUser(u);
    saveSession(u);
    return u;
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
      tokenReady,
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
