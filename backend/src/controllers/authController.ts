import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidators';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await AuthService.register(input);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await AuthService.login(input);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async loginWith2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tempToken, totpToken } = req.body as { tempToken: string; totpToken: string };
      if (!tempToken || !totpToken) throw new Error('Dados incompletos');
      const result = await AuthService.loginWith2FA(tempToken, totpToken);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      await AuthService.logout(refreshToken);
      res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: { userId: req.userId, email: req.userEmail } });
    } catch (err) {
      next(err);
    }
  }
}
