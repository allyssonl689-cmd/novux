import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../config/database';
import { signAccessToken, signRefreshToken } from '../config/auth';
import { env } from '../config/env';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/google', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = req.body as { credential?: string };
    if (!credential) {
      res.status(400).json({ success: false, message: 'Token Google ausente' });
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      res.status(501).json({ success: false, message: 'Login com Google não configurado no servidor' });
      return;
    }

    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(400).json({ success: false, message: 'Token Google inválido' });
      return;
    }

    const { email, name, picture } = payload;

    // Upsert user
    const { rows } = await db.query<{ id: string; name: string; email: string; avatar_url: string | null }>(
      `INSERT INTO users (name, email, password_hash, avatar_url)
       VALUES ($1, $2, 'google-oauth', $3)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url), updated_at = NOW()
       RETURNING id, name, email, avatar_url`,
      [name ?? email.split('@')[0], email.toLowerCase(), picture ?? null]
    );

    const user = rows[0];
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({ success: true, data: { accessToken, refreshToken, user } });
  } catch (err) {
    next(err);
  }
});

export default router;
