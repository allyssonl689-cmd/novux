import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate } from '../middleware/authMiddleware';
import { db } from '../config/database';

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { rows } = await db.query<{ is_admin: boolean }>(
    'SELECT is_admin FROM users WHERE id = $1',
    [req.userId]
  );
  if (!rows[0]?.is_admin) {
    res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
    return;
  }
  next();
}

router.use(authenticate, requireAdmin);
router.get('/metrics', AdminController.metrics);
router.get('/users',   AdminController.users);

export default router;
