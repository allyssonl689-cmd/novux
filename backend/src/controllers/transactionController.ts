import { Request, Response, NextFunction } from 'express';
import { TransactionModel } from '../models/TransactionModel';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
} from '../validators/transactionValidators';
import { AppError } from '../middleware/errorHandler';

export class TransactionController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = transactionFiltersSchema.parse(req.query);
      const result = await TransactionModel.findAll(req.userId, filters);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await TransactionModel.findById(req.params.id, req.userId);
      if (!transaction) throw new AppError('Transação não encontrada', 404);
      res.json({ success: true, data: transaction });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createTransactionSchema.parse(req.body);
      const transaction = await TransactionModel.create(req.userId, input);
      res.status(201).json({ success: true, data: transaction });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateTransactionSchema.parse(req.body);
      const transaction = await TransactionModel.update(req.params.id, req.userId, input);
      if (!transaction) throw new AppError('Transação não encontrada', 404);
      res.json({ success: true, data: transaction });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await TransactionModel.delete(req.params.id, req.userId);
      if (!deleted) throw new AppError('Transação não encontrada', 404);
      res.json({ success: true, message: 'Transação removida com sucesso' });
    } catch (err) {
      next(err);
    }
  }

  static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const result = await TransactionModel.findAll(req.userId, {
        startDate,
        endDate,
        limit: 10000,
      });

      const headers = ['id', 'type', 'value', 'category', 'date', 'description', 'notes', 'tags'];
      const rows = result.data.map(t =>
        [t.id, t.type, t.value, t.category, t.date, `"${t.description}"`, `"${t.notes ?? ''}"`, t.tags.join('|')].join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transacoes.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
