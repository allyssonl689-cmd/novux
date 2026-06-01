import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { createHash } from 'crypto';
import { db } from '../config/database';
import { signAccessToken, signRefreshToken } from '../config/auth';
import { env } from '../config/env';
import { encrypt, decrypt, emailHmac } from '../utils/encryption';

const router = Router();

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID ?? '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const REFRESH_COOKIE = 'novux_refresh';

router.post('/google', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = req.body as { credential?: string };
    if (!credential) {
      res.status(400).json({ success: false, message: 'Token Google ausente' });
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      res.status(503).json({ success: false, message: 'Login com Google indisponível no momento' });
      return;
    }

    const ticket  = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(400).json({ success: false, message: 'Token Google inválido' });
      return;
    }

    const { email, name, picture } = payload;
    const normalizedEmail  = email.toLowerCase();
    const encryptedEmail   = encrypt(normalizedEmail);
    const encryptedName    = encrypt(name ?? normalizedEmail.split('@')[0]);
    const hash             = emailHmac(normalizedEmail);

    // Verifica se já existe (hash ou plaintext legado)
    const { rows: existing } = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE email_hash = $1 OR (email_hash IS NULL AND email = $2) LIMIT 1`,
      [hash, normalizedEmail]
    );

    let rows: Array<{ id: string; name: string; email: string; avatar_url: string | null }>;
    if (existing[0]) {
      const { rows: updated } = await db.query<{ id: string; name: string; email: string; avatar_url: string | null }>(
        `UPDATE users SET name = $1, email = $2, email_hash = $3, avatar_url = COALESCE($4, avatar_url), updated_at = NOW()
         WHERE id = $5 RETURNING id, name, email, avatar_url`,
        [encryptedName, encryptedEmail, hash, picture ?? null, existing[0].id]
      );
      rows = updated;
    } else {
      const { rows: inserted } = await db.query<{ id: string; name: string; email: string; avatar_url: string | null }>(
        `INSERT INTO users (name, email, email_hash, password_hash, avatar_url)
         VALUES ($1, $2, $3, 'google-oauth', $4)
         RETURNING id, name, email, avatar_url`,
        [encryptedName, encryptedEmail, hash, picture ?? null]
      );
      rows = inserted;
    }

    const user = {
      ...rows[0],
      name:  decrypt(rows[0].name),
      email: decrypt(rows[0].email),
    };

    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    const tokenHash    = createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, refreshToken, tokenHash, expiresAt]
    );

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ success: true, data: { accessToken, user } });
  } catch (err) {
    next(err);
  }
});

export default router;
