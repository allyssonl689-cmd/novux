import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate } from '../middleware/authMiddleware';
import { dataLimiter } from '../middleware/rateLimiter';
import { db } from '../config/database';

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows } = await db.query<{ is_admin: boolean }>(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    if (!rows[0]?.is_admin) {
      res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
      return;
    }
    next();
  } catch (err) { next(err); }
}

// dataLimiter: rate-limit por usuário também nas rotas admin (antes só global por IP).
router.use(authenticate, dataLimiter, requireAdmin);
router.get('/metrics', AdminController.metrics);
router.get('/users',   AdminController.users);

export default router;
