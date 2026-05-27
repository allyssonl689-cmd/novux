import { Request, Response, NextFunction } from 'express';
import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class TwoFactorController {
  static async setup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rows } = await db.query<{ email: string; totp_enabled: boolean }>(
        'SELECT email, totp_enabled FROM users WHERE id = $1',
        [req.userId]
      );
      const user = rows[0];
      if (!user) throw new AppError('Usuário não encontrado', 404);
      if (user.totp_enabled) throw new AppError('2FA já está ativado', 400);

      const secret = generateSecret();
      const otpauth = generateURI({ label: user.email, issuer: 'Novux Finance', secret });
      const qrDataUrl = await QRCode.toDataURL(otpauth);

      // Store secret temporarily (not enabled until verified)
      await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, req.userId]);

      res.json({ success: true, data: { qrDataUrl, secret } });
    } catch (err) {
      next(err);
    }
  }

  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as { token: string };
      if (!token) throw new AppError('Token obrigatório', 400);

      const { rows } = await db.query<{ totp_secret: string | null }>(
        'SELECT totp_secret FROM users WHERE id = $1',
        [req.userId]
      );
      const secret = rows[0]?.totp_secret;
      if (!secret) throw new AppError('Configure o 2FA primeiro', 400);

      const result = verifySync({ token, secret });
      if (!result?.valid) throw new AppError('Token inválido', 400);

      await db.query('UPDATE users SET totp_enabled = true WHERE id = $1', [req.userId]);
      res.json({ success: true, message: '2FA ativado com sucesso' });
    } catch (err) {
      next(err);
    }
  }

  static async disable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as { token: string };
      if (!token) throw new AppError('Token obrigatório', 400);

      const { rows } = await db.query<{ totp_secret: string | null; totp_enabled: boolean }>(
        'SELECT totp_secret, totp_enabled FROM users WHERE id = $1',
        [req.userId]
      );
      const user = rows[0];
      if (!user?.totp_enabled || !user.totp_secret) throw new AppError('2FA não está ativado', 400);

      const result = verifySync({ token, secret: user.totp_secret });
      if (!result?.valid) throw new AppError('Token inválido', 400);

      await db.query('UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1', [req.userId]);
      res.json({ success: true, message: '2FA desativado' });
    } catch (err) {
      next(err);
    }
  }

  static async status(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rows } = await db.query<{ totp_enabled: boolean }>(
        'SELECT totp_enabled FROM users WHERE id = $1',
        [req.userId]
      );
      res.json({ success: true, data: { enabled: rows[0]?.totp_enabled ?? false } });
    } catch (err) {
      next(err);
    }
  }
}
