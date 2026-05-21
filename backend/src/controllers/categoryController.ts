import { Request, Response, NextFunction } from 'express';
import { CategoryModel } from '../models/CategoryModel';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense', 'both']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryModel.findAllForUser(req.userId);
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = categorySchema.parse(req.body);
      const category = await CategoryModel.create(req.userId, input);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = categorySchema.partial().parse(req.body);
      const category = await CategoryModel.update(req.params.id, req.userId, input);
      if (!category) throw new AppError('Categoria não encontrada ou é padrão do sistema', 404);
      res.json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await CategoryModel.delete(req.params.id, req.userId);
      if (!deleted) throw new AppError('Categoria não encontrada ou é padrão do sistema', 404);
      res.json({ success: true, message: 'Categoria removida com sucesso' });
    } catch (err) {
      next(err);
    }
  }
}
