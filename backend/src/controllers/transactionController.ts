import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { TransactionModel } from '../models/TransactionModel';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
} from '../validators/transactionValidators';
import { AppError } from '../middleware/errorHandler';
import { resolveUploadPath, removeUploadFile } from '../utils/uploads';

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
      if (!existing) {
        // Transação inexistente: remove o arquivo recém-enviado para não deixar órfão
        removeUploadFile(req.file.filename);
        throw new AppError('Transação não encontrada', 404);
      }

      const oldUrl = (existing as any).attachment_url as string | undefined;
      const url = `/uploads/${req.file.filename}`;
      const transaction = await TransactionModel.setAttachment(String(req.params.id), req.userId, url);
      if (!transaction) {
        removeUploadFile(req.file.filename);
        throw new AppError('Transação não encontrada', 404);
      }

      // Remove o anexo anterior (se houver e for diferente do novo)
      if (oldUrl && oldUrl !== url) removeUploadFile(oldUrl);

      res.json({ success: true, data: transaction });
    } catch (err) { next(err); }
  }

  /**
   * Serve o comprovante de forma autenticada: valida que a transação pertence ao
   * usuário antes de transmitir o arquivo. Substitui o antigo express.static público.
   */
  static async getAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await TransactionModel.findById(String(req.params.id), req.userId);
      const attachmentUrl = transaction ? (transaction as any).attachment_url as string | undefined : undefined;
      if (!transaction || !attachmentUrl) throw new AppError('Comprovante não encontrado', 404);

      const filePath = resolveUploadPath(attachmentUrl);
      if (!fs.existsSync(filePath)) throw new AppError('Arquivo não encontrado', 404);

      // nosniff + inline: tipos já restritos a imagem/pdf no upload (fileFilter)
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.sendFile(filePath, (err) => { if (err) next(err); });
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

      // Safely escape a CSV cell: wrap in quotes, escape internal quotes, strip formula-injection chars
      function csvCell(val: unknown): string {
        const str = String(val ?? '').replace(/"/g, '""');
        // Prevent CSV formula injection (cells starting with =, +, -, @)
        const safe = str.replace(/^[=+\-@\t\r]/, "'$&");
        return `"${safe}"`;
      }

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
