import { apiFetch } from './api';

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
    refreshToken: string;
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
    localStorage.setItem('novux_access_token', res.data.accessToken);
    localStorage.setItem('novux_refresh_token', res.data.refreshToken);
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
    localStorage.setItem('novux_access_token', d.accessToken);
    localStorage.setItem('novux_refresh_token', d.refreshToken);
    return toAuthUser(d.user);
  },

  async loginWith2FA(tempToken: string, totpToken: string): Promise<AuthUser> {
    const res = await apiFetch<AuthResponse>('/api/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, totpToken }),
    });
    localStorage.setItem('novux_access_token', res.data.accessToken);
    localStorage.setItem('novux_refresh_token', res.data.refreshToken);
    return toAuthUser(res.data.user);
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('novux_refresh_token');
    try {
      if (refreshToken) {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      localStorage.removeItem('novux_access_token');
      localStorage.removeItem('novux_refresh_token');
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
    localStorage.setItem('novux_access_token', res.data.accessToken);
    localStorage.setItem('novux_refresh_token', res.data.refreshToken);
    return toAuthUser(res.data.user);
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('novux_access_token');
  },
};
