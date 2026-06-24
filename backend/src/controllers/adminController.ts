import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/UserModel';
import { TransactionModel } from '../models/TransactionModel';
import { audit } from '../services/auditService';
import { db } from '../config/database';

/** Mascara o e-mail para exibição no painel admin: joao@dominio.com -> j***@dominio.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export class AdminController {
  static async metrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await audit(req.userId, 'admin_view_metrics', 'metrics', req.ip);

      const userMetrics = await UserModel.getMetrics();

      const { rows: txRows } = await db.query<{ total: string; this_month: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE date >= DATE_TRUNC('month', NOW())) AS this_month
         FROM transactions`
      );

      const { rows: growthRows } = await db.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                COUNT(*) AS registrations
         FROM users
         GROUP BY month ORDER BY month DESC LIMIT 6`
      );

      const { rows: catRows } = await db.query(
        `SELECT category, COUNT(*) AS count
         FROM transactions WHERE type = 'expense'
         GROUP BY category ORDER BY count DESC LIMIT 8`
      );

      res.json({
        success: true,
        data: {
          users: userMetrics,
          transactions: {
            total: parseInt(txRows[0]?.total ?? '0', 10),
            thisMonth: parseInt(txRows[0]?.this_month ?? '0', 10),
          },
          growth: growthRows,
          topCategories: catRows,
        },
      });
    } catch (err) { next(err); }
  }

  static async users(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit  = Math.min(parseInt(String(req.query.limit  ?? 50), 10), 100);
      const offset = parseInt(String(req.query.offset ?? 0), 10);
      await audit(req.userId, 'admin_list_users', 'users', req.ip, { limit, offset });

      const users  = await UserModel.listAll(limit, offset);
      // Não expor e-mail em claro no painel (mascarado); resposta nunca cacheada.
      const masked = users.map(u => ({ ...u, email: maskEmail(u.email) }));
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, data: masked });
    } catch (err) { next(err); }
  }
}
