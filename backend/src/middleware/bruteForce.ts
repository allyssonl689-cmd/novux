import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function bruteForceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const email = (req.body?.email ?? '').toLowerCase();
  const ip    = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

  if (!email) { next(); return; }

  try {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM login_attempts
       WHERE email = $1 AND success = FALSE
         AND created_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'`,
      [email]
    );

    const attempts = parseInt(rows[0]?.count ?? '0', 10);

    if (attempts >= MAX_ATTEMPTS) {
      res.status(429).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: `Conta temporariamente bloqueada após ${MAX_ATTEMPTS} tentativas falhas. Tente novamente em ${WINDOW_MINUTES} minutos.`,
      });
      return;
    }

    next();
  } catch {
    next(); // Falha silenciosa — não bloqueia o fluxo normal
  }
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  try {
    await db.query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
      [email.toLowerCase(), ip, success]
    );
  } catch {
    // silently ignore
  }
}
