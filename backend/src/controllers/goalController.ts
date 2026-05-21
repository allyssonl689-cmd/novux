import { Request, Response, NextFunction } from 'express';
import { GoalModel } from '../models/GoalModel';
import { createGoalSchema, updateGoalSchema } from '../validators/goalValidators';
import { AppError } from '../middleware/errorHandler';

export class GoalController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const goals = await GoalModel.findAll(req.userId);
      res.json({ success: true, data: goals });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const goal = await GoalModel.findById(req.params.id, req.userId);
      if (!goal) throw new AppError('Meta não encontrada', 404);
      res.json({ success: true, data: goal });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createGoalSchema.parse(req.body);
      const goal = await GoalModel.create(req.userId, input);
      res.status(201).json({ success: true, data: goal });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateGoalSchema.parse(req.body);
      const goal = await GoalModel.update(req.params.id, req.userId, input);
      if (!goal) throw new AppError('Meta não encontrada', 404);
      res.json({ success: true, data: goal });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await GoalModel.delete(req.params.id, req.userId);
      if (!deleted) throw new AppError('Meta não encontrada', 404);
      res.json({ success: true, message: 'Meta removida com sucesso' });
    } catch (err) {
      next(err);
    }
  }
}
