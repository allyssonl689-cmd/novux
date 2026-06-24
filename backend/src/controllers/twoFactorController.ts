import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { encrypt, decrypt } from '../utils/encryption';
import { totpTokenSchema } from '../validators/authValidators';
import { audit } from '../services/auditService';
import { generateRecoveryCodes } from '../services/recoveryCodeService';

const disableSchema = totpTokenSchema.extend({
  currentPassword: z.string().min(1).optional(),
});

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

      const secret   = generateSecret();
      const otpauth  = generateURI({ label: decrypt(user.email) ?? user.email, issuer: 'Novux Finance', secret });
      const qrDataUrl = await QRCode.toDataURL(otpauth);

      // Salva o secret criptografado — nunca em texto puro
      await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [encrypt(secret), req.userId]);

      res.json({ success: true, data: { qrDataUrl, secret } });
    } catch (err) {
      next(err);
    }
  }

  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = totpTokenSchema.parse(req.body);

      const { rows } = await db.query<{ totp_secret: string | null }>(
        'SELECT totp_secret FROM users WHERE id = $1',
        [req.userId]
      );
      const encryptedSecret = rows[0]?.totp_secret;
      if (!encryptedSecret) throw new AppError('Configure o 2FA primeiro', 400);

      const secret = decrypt(encryptedSecret)!;
      const result = verifySync({ token, secret });
      if (!result?.valid) throw new AppError('Token inválido', 400);

      await db.query('UPDATE users SET totp_enabled = true WHERE id = $1', [req.userId]);
      await audit(req.userId, 'totp_enabled', 'account', req.ip);

      // Gera os códigos de recuperação e os devolve UMA única vez (só o hash fica salvo).
      const recoveryCodes = await generateRecoveryCodes(req.userId);
      res.json({ success: true, message: '2FA ativado com sucesso', data: { recoveryCodes } });
    } catch (err) {
      next(err);
    }
  }

  static async disable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, currentPassword } = disableSchema.parse(req.body);

      const { rows } = await db.query<{ totp_secret: string | null; totp_enabled: boolean; password_hash: string }>(
        'SELECT totp_secret, totp_enabled, password_hash FROM users WHERE id = $1',
        [req.userId]
      );
      const user = rows[0];
      if (!user?.totp_enabled || !user.totp_secret) throw new AppError('2FA não está ativado', 400);

      // Reautenticação por senha: desativar o 2FA reduz a postura de segurança da
      // conta, então exige a senha (não basta uma sessão/token possivelmente roubado).
      // Contas OAuth-only (sem senha local — password_hash não-bcrypt) ficam dispensadas.
      if (user.password_hash?.startsWith('$2')) {
        if (!currentPassword) throw new AppError('Senha atual obrigatória para desativar o 2FA', 400);
        const okPass = await bcrypt.compare(currentPassword, user.password_hash);
        if (!okPass) throw new AppError('Senha incorreta', 401);
      }

      const secret = decrypt(user.totp_secret)!;
      const result = verifySync({ token, secret });
      if (!result?.valid) throw new AppError('Token inválido', 400);

      await db.query('UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1', [req.userId]);
      await db.query('DELETE FROM two_factor_recovery_codes WHERE user_id = $1', [req.userId]);
      await audit(req.userId, 'totp_disabled', 'account', req.ip);
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
