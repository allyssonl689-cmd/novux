import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate } from '../middleware/authMiddleware';
import { dataLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);
router.use(dataLimiter);

router.get('/summary', ReportController.summary);
router.get('/monthly', ReportController.monthly);

export default router;
