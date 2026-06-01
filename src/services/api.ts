// VITE_API_URL deve ser definido nas variáveis de ambiente do Vercel:
// VITE_API_URL=https://novux.onrender.com
// Fallback para produção caso a variável não esteja configurada.
const BASE_URL = import.meta.env.VITE_API_URL
  ?? (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://novux.onrender.com'
      : 'http://localhost:3001');

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

// Erro lançado quando o servidor responde 401 — sessão definitivamente inválida
export class AuthExpiredError extends Error {
  constructor() { super('Sessão expirada'); this.name = 'AuthExpiredError'; }
}

export async function refreshAccessToken(): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Erro de rede (backend hibernando/offline) — NÃO é sessão inválida
    throw new Error('Network error during refresh');
  }

  if (res.status === 401) {
    tokenStore.clear();
    throw new AuthExpiredError();
  }

  if (!res.ok) {
    throw new Error(`Refresh failed: ${res.status}`);
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
      } catch (refreshErr) {
        isRefreshing = false;
        if (refreshErr instanceof AuthExpiredError) {
          tokenStore.clear();
          window.location.href = '/login';
        }
        throw refreshErr;
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
