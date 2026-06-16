import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { registerSchema, loginSchema, changePasswordSchema, resetPasswordSchema } from '../validators/authValidators';
import { env } from '../config/env';

const REFRESH_COOKIE = 'novux_refresh';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

function setRefreshCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    // 'none' necessário em produção para cross-site (Vercel → Render)
    // 'lax' em desenvolvimento (HTTP local não aceita 'none' sem secure)
    sameSite: isProd ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
}

function getRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.split(';').find(c => c.trim().startsWith(`${REFRESH_COOKIE}=`));
  return match ? decodeURIComponent(match.trim().slice(REFRESH_COOKIE.length + 1)) : undefined;
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await AuthService.register(input);
      setRefreshCookie(res, result.refreshToken);
      res.status(201).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const ip    = req.ip ?? req.socket?.remoteAddress;
      const result = await AuthService.login(input, ip);

      if ('requires2FA' in result) {
        res.json({ success: true, data: result });
        return;
      }

      setRefreshCookie(res, result.refreshToken);
      res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (err) {
      next(err);
    }
  }

  static async loginWith2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tempToken, totpToken } = req.body as { tempToken: string; totpToken: string };
      if (!tempToken || !totpToken) throw new Error('Dados incompletos');
      const result = await AuthService.loginWith2FA(tempToken, totpToken);
      setRefreshCookie(res, result.refreshToken);
      res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = getRefreshCookie(req);
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Sessão não encontrada. Faça login novamente.' });
        return;
      }
      const result = await AuthService.refresh(refreshToken);
      // Rotação: o novo refresh token vai só no cookie httpOnly; o corpo expõe
      // apenas o access token (contrato inalterado para o frontend).
      setRefreshCookie(res, result.refreshToken);
      res.json({ success: true, data: { accessToken: result.accessToken } });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = getRefreshCookie(req);
      const ip = req.ip ?? req.socket?.remoteAddress;
      if (refreshToken) {
        await AuthService.logout(refreshToken, req.userId, ip);
      }
      clearRefreshCookie(res);
      res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const ip = req.ip ?? req.socket?.remoteAddress;
      await AuthService.changePassword(req.userId, currentPassword, newPassword, ip);
      // Invalida o cookie de refresh (refresh tokens foram deletados no service)
      clearRefreshCookie(res);
      res.json({ success: true, message: 'Senha alterada com sucesso. Faça login novamente.' });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as { email: string };
      if (!email) { res.status(400).json({ success: false, message: 'E-mail obrigatório' }); return; }
      const ip = req.ip ?? req.socket?.remoteAddress;
      await AuthService.forgotPassword(email, ip);
      // Resposta sempre 200 para não vazar se o e-mail existe
      res.json({ success: true, message: 'Se esse e-mail estiver cadastrado, você receberá um link em instantes.' });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      const ip = req.ip ?? req.socket?.remoteAddress;
      await AuthService.resetPassword(token, newPassword, ip);
      res.json({ success: true, message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip ?? req.socket?.remoteAddress;
      await AuthService.deleteAccount(req.userId, ip);
      clearRefreshCookie(res);
      res.json({ success: true, message: 'Conta e todos os dados excluídos permanentemente' });
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.query as { token?: string };
      if (!token) { res.status(400).json({ success: false, message: 'Token obrigatório' }); return; }
      await AuthService.verifyEmail(token);
      res.json({ success: true, message: 'E-mail verificado com sucesso!' });
    } catch (err) { next(err); }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await import('../models/UserModel').then(m => m.UserModel.findById(req.userId));
      if (!user) { res.status(404).json({ success: false, message: 'Usuário não encontrado' }); return; }
      if ((user as any).email_verified) { res.json({ success: true, message: 'E-mail já verificado' }); return; }
      await AuthService.resendVerification(req.userId, user.email, user.name ?? undefined);
      res.json({ success: true, message: 'E-mail de verificação reenviado' });
    } catch (err) { next(err); }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: { userId: req.userId, email: req.userEmail } });
    } catch (err) {
      next(err);
    }
  }
}
