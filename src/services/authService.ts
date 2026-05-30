import { apiFetch, tokenStore, refreshAccessToken } from './api';

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface ApiUser {
  id: string;
  name?: string;
  email: string;
  avatar_url?: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: ApiUser;
  };
}

interface MeResponse {
  success: boolean;
  data: { id: string; name?: string; email: string; avatar_url?: string };
}

function toAuthUser(u: ApiUser): AuthUser {
  return { userId: u.id, email: u.email, name: u.name, avatarUrl: u.avatar_url };
}

export const authService = {
  async register(name: string, email: string, password: string): Promise<AuthUser> {
    const res = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    tokenStore.set(res.data.accessToken);
    return toAuthUser(res.data.user);
  },

  async login(email: string, password: string): Promise<AuthUser | { requires2FA: true; tempToken: string }> {
    const res = await apiFetch<{ success: boolean; data: AuthResponse['data'] | { requires2FA: true; tempToken: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if ('requires2FA' in res.data && res.data.requires2FA) {
      return { requires2FA: true, tempToken: res.data.tempToken };
    }
    const d = res.data as AuthResponse['data'];
    tokenStore.set(d.accessToken);
    return toAuthUser(d.user);
  },

  async loginWith2FA(tempToken: string, totpToken: string): Promise<AuthUser> {
    const res = await apiFetch<AuthResponse>('/api/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, totpToken }),
    });
    tokenStore.set(res.data.accessToken);
    return toAuthUser(res.data.user);
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      tokenStore.clear();
    }
  },

  async me(): Promise<AuthUser> {
    const res = await apiFetch<MeResponse>('/api/users/me');
    return { userId: res.data.id, email: res.data.email, name: res.data.name, avatarUrl: res.data.avatar_url };
  },

  async loginWithGoogle(credential: string): Promise<AuthUser> {
    const res = await apiFetch<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    tokenStore.set(res.data.accessToken);
    return toAuthUser(res.data.user);
  },

  // Tenta restaurar sessão via cookie HttpOnly — chamado no boot da aplicação
  async tryRestoreSession(): Promise<AuthUser | null> {
    try {
      await refreshAccessToken();
      return await this.me();
    } catch {
      return null;
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  isAuthenticated(): boolean {
    return !!tokenStore.get();
  },
};
