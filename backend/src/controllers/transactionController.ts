import path from 'path';
import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { TransactionModel } from '../models/TransactionModel';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
  bulkCreateSchema,
} from '../validators/transactionValidators';
import { AppError } from '../middleware/errorHandler';
import * as storage from '../services/storageService';
import { csvCell } from '../utils/csv';

export class TransactionController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = transactionFiltersSchema.parse(req.query);
      const result = await TransactionModel.findAll(req.userId, filters);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async tags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tags = await TransactionModel.getDistinctTags(req.userId);
      res.json({ success: true, data: tags });
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await TransactionModel.findById(String(req.params.id), req.userId);
      if (!transaction) throw new AppError('Transação não encontrada', 404);
      res.json({ success: true, data: transaction });
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createTransactionSchema.parse(req.body);
      const transaction = await TransactionModel.create(req.userId, input as any);
      res.status(201).json({ success: true, data: transaction });
    } catch (err) { next(err); }
  }

  static async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactions } = bulkCreateSchema.parse(req.body);
      // Atômico: ou todas as linhas do CSV entram, ou nenhuma (createMany usa transação).
      const created = await TransactionModel.createMany(req.userId, transactions as any);
      res.status(201).json({ success: true, data: created });
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateTransactionSchema.parse(req.body);
      const transaction = await TransactionModel.update(String(req.params.id), req.userId, input as any);
      if (!transaction) throw new AppError('Transação não encontrada', 404);
      res.json({ success: true, data: transaction });
    } catch (err) { next(err); }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await TransactionModel.delete(String(req.params.id), req.userId);
      if (!deleted) throw new AppError('Transação não encontrada', 404);
      res.json({ success: true, message: 'Transação removida com sucesso' });
    } catch (err) { next(err); }
  }

  static async uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('Nenhum arquivo enviado', 400);

      const existing = await TransactionModel.findById(String(req.params.id), req.userId);
      if (!existing) throw new AppError('Transação não encontrada', 404);

      // Chave do objeto no bucket: namespaced por usuário/transação + nome aleatório.
      const ext = path.extname(req.file.originalname).toLowerCase();
      const key = `${req.userId}/${req.params.id}/${randomBytes(16).toString('hex')}${ext}`;
      await storage.uploadAttachment(key, req.file.buffer, req.file.mimetype);

      const oldKey = (existing as any).attachment_url as string | undefined;
      const transaction = await TransactionModel.setAttachment(String(req.params.id), req.userId, key);
      if (!transaction) {
        // Não conseguiu vincular: remove o objeto recém-enviado para não deixar órfão.
        await storage.removeAttachment(key);
        throw new AppError('Transação não encontrada', 404);
      }

      // Remove o anexo anterior (se houver e for diferente do novo)
      if (oldKey && oldKey !== key) await storage.removeAttachment(oldKey);

      res.json({ success: true, data: transaction });
    } catch (err) { next(err); }
  }

  /**
   * Serve o comprovante de forma autenticada (proxy): valida que a transação
   * pertence ao usuário, baixa o objeto do bucket PRIVADO do Supabase e o transmite.
   * O arquivo nunca é exposto publicamente.
   */
  static async getAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await TransactionModel.findById(String(req.params.id), req.userId);
      const key = transaction ? (transaction as any).attachment_url as string | undefined : undefined;
      if (!transaction || !key) throw new AppError('Comprovante não encontrado', 404);

      const { buffer, contentType } = await storage.downloadAttachment(key);

      // nosniff: tipos já restritos a imagem/pdf no upload (fileFilter)
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(buffer);
    } catch (err) { next(err); }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await TransactionModel.getHistory(String(req.params.id), req.userId);
      res.json({ success: true, data: history });
    } catch (err) { next(err); }
  }

  static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, limit: limitStr } = req.query as { startDate?: string; endDate?: string; limit?: string };
      const limit = Math.min(parseInt(limitStr ?? '10000', 10), 50000);
      const result = await TransactionModel.findAll(req.userId, { startDate, endDate, limit });

      const headers = ['id','type','value','currency','category','date','description','notes','tags','paid'];
      const rows = result.data.map(t => [
        csvCell(t.id), csvCell(t.type), csvCell(t.value),
        csvCell((t as any).currency ?? 'BRL'), csvCell(t.category),
        csvCell(t.date), csvCell(t.description), csvCell(t.notes ?? ''),
        csvCell(t.tags.join('|')), csvCell(t.paid),
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="novux-transacoes.csv"');
      res.send(csv);
    } catch (err) { next(err); }
  }
}
