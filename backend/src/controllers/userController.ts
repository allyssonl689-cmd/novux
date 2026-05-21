import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/UserModel';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar_url: z.string().url().optional(),
});

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user) throw new AppError('Usuário não encontrado', 404);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateProfileSchema.parse(req.body);
      const user = await UserModel.update(req.userId, input);
      if (!user) throw new AppError('Usuário não encontrado', 404);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
}
