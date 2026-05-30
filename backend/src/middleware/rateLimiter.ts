import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' ? 2000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Limite restrito para login/register (previne brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Limite mais permissivo para recuperação de senha (5 por hora por IP)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 200 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' },
});

// Limite por usuário autenticado para rotas de dados (previne scraping e abuso)
export const dataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: env.NODE_ENV === 'development' ? 500 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).userId ?? req.ip ?? 'anon',
  message: { success: false, message: 'Muitas requisições. Aguarde um momento.' },
});
