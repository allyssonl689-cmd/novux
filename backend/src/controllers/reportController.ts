import { Request, Response, NextFunction } from 'express';
import { TransactionModel } from '../models/TransactionModel';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const summaryQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export class ReportController {
  static async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = summaryQuerySchema.parse(req.query);
      const now = new Date();
      const start = startDate ?? format(startOfMonth(now), 'yyyy-MM-dd');
      const end = endDate ?? format(endOfMonth(now), 'yyyy-MM-dd');

      // Período anterior equivalente (mesma duração, imediatamente antes de `start`)
      // — usado para os deltas "vs período anterior" do Dashboard.
      const startMs = new Date(`${start}T00:00:00`).getTime();
      const endMs   = new Date(`${end}T00:00:00`).getTime();
      const duration = Math.max(0, endMs - startMs);
      const prevEnd   = format(new Date(startMs - 86_400_000), 'yyyy-MM-dd');
      const prevStart = format(new Date(startMs - 86_400_000 - duration), 'yyyy-MM-dd');

      const [summary, previous, categories] = await Promise.all([
        TransactionModel.getSummary(req.userId, start, end),
        TransactionModel.getSummary(req.userId, prevStart, prevEnd),
        TransactionModel.getCategoryBreakdown(req.userId, start, end),
      ]);

      res.json({
        success: true,
        data: {
          summary, previous, categories,
          period: { start, end },
          previousPeriod: { start: prevStart, end: prevEnd },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async monthlyBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = await TransactionModel.getMonthlyBreakdown(req.userId);
      res.json({ success: true, data: { months } });
    } catch (err) {
      next(err);
    }
  }

  static async monthly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year } = summaryQuerySchema.parse(req.query);
      const targetYear = year ?? new Date().getFullYear();
      const data = await TransactionModel.getMonthlySummary(req.userId, targetYear);
      res.json({ success: true, data: { year: targetYear, months: data } });
    } catch (err) {
      next(err);
    }
  }
}
