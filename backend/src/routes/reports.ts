import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/summary', ReportController.summary);
router.get('/monthly', ReportController.monthly);

export default router;
