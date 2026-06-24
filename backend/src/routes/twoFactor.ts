import { Router } from 'express';
import { TwoFactorController } from '../controllers/twoFactorController';
import { authenticate } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);

router.get('/status',  TwoFactorController.status);
// authLimiter (20 req/15min por IP) limita brute force de TOTP no setup/verify/disable.
router.post('/setup',  authLimiter, TwoFactorController.setup);
router.post('/verify', authLimiter, TwoFactorController.verify);
router.post('/disable',authLimiter, TwoFactorController.disable);

export default router;
