import { Router } from 'express';
import { TwoFactorController } from '../controllers/twoFactorController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticate);

router.get('/status',  TwoFactorController.status);
router.post('/setup',  TwoFactorController.setup);
router.post('/verify', TwoFactorController.verify);
router.post('/disable',TwoFactorController.disable);

export default router;
