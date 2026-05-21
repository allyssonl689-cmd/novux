const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type RefreshSubscriber = (token: string) => void;

let isRefreshing = false;
let refreshSubscribers: RefreshSubscriber[] = [];

function subscribeTokenRefresh(cb: RefreshSubscriber) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('novux_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem('novux_access_token');
    localStorage.removeItem('novux_refresh_token');
    window.location.href = '/login';
    throw new Error('Token refresh failed');
  }

  const json = await res.json();
  const newToken: string = json.data.accessToken;
  localStorage.setItem('novux_access_token', newToken);
  if (json.data.refreshToken) {
    localStorage.setItem('novux_refresh_token', json.data.refreshToken);
  }
  return newToken;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('novux_access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } catch {
        isRefreshing = false;
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    } else {
      await new Promise<void>(resolve => {
        subscribeTokenRefresh(newToken => {
          headers['Authorization'] = `Bearer ${newToken}`;
          resolve();
        });
      });
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    }
  }

  const json = await res.json().catch(() => ({ success: false, message: res.statusText }));

  if (!res.ok) {
    throw new Error(json.message ?? `Erro ${res.status}`);
  }

  return json as T;
}
