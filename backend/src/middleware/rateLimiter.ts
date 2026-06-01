import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Global: 500 req/15min por IP (padrão generoso para SaaS)
// Ajuste via variável RATE_LIMIT_MAX no Render (recomendado: 500)
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' ? 5000 : Math.max(env.RATE_LIMIT_MAX, 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Login/register: 20 req/15min — mantém proteção contra brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Limite permissivo para renovação de token (chamado a cada page load)
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas renovações de sessão. Aguarde alguns minutos.' },
});

// Limite mais permissivo para recuperação de senha (5 por hora por IP)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 200 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' },
});

// Por usuário autenticado: 300 req/min (suficiente para uso intenso do app)
export const dataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'development' ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).userId ?? req.ip ?? 'anon',
  message: { success: false, message: 'Muitas requisições. Aguarde um momento.' },
});
