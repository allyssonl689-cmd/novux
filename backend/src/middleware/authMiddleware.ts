import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/auth';
import { UserModel } from '../models/UserModel';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userEmail: string;
    }
  }
}

// Cache curto da verificação "usuário existe e está ativo" para não bater no banco
// (+ decrypt) a cada request. O access token já é validado por assinatura em toda
// requisição; este cache só evita a consulta extra. TTL pequeno → desativação de
// conta propaga em poucos segundos. Guarda apenas resultados positivos (ativos).
const AUTH_CACHE_TTL_MS = 30_000;
const activeUntil = new Map<string, number>(); // userId → timestamp de expiração (ms)

/** Invalida o cache de um usuário (ex.: ao desativar a conta). */
export function invalidateAuthCache(userId: string): void {
  activeUntil.delete(userId);
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    const now = Date.now();
    const cached = activeUntil.get(payload.userId);
    if (!cached || cached <= now) {
      const user = await UserModel.findById(payload.userId);
      if (!user || !user.is_active) {
        activeUntil.delete(payload.userId);
        res.status(401).json({ success: false, message: 'Usuário não encontrado ou inativo' });
        return;
      }
      // Poda oportunista para não crescer indefinidamente (apps pequenos não chegam aqui).
      if (activeUntil.size > 10_000) {
        for (const [k, exp] of activeUntil) if (exp <= now) activeUntil.delete(k);
      }
      activeUntil.set(payload.userId, now + AUTH_CACHE_TTL_MS);
    }

    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
}
