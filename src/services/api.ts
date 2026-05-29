const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Access token armazenado apenas em memória — nunca no localStorage
let _accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => _accessToken,
  set: (t: string): void  => { _accessToken = t; },
  clear: (): void         => { _accessToken = null; },
};

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

export async function refreshAccessToken(): Promise<string> {
  // O refresh token é enviado automaticamente via cookie HttpOnly
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    tokenStore.clear();
    // Não redireciona aqui — quem decide redirecionar é o chamador (apiFetch ou tryRestoreSession)
    throw new Error('Token refresh failed');
  }

  const json = await res.json();
  const newToken: string = json.data.accessToken;
  tokenStore.set(newToken);
  return newToken;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // necessário para enviar o cookie HttpOnly de refresh
  });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
      } catch {
        isRefreshing = false;
        tokenStore.clear();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    } else {
      await new Promise<void>(resolve => {
        subscribeTokenRefresh(newToken => {
          headers['Authorization'] = `Bearer ${newToken}`;
          resolve();
        });
      });
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
    }
  }

  const json = await res.json().catch(() => ({ success: false, message: res.statusText }));

  if (!res.ok) {
    throw new Error(json.message ?? `Erro ${res.status}`);
  }

  return json as T;
}
