import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authenticate } from '../middleware/authMiddleware';
import { dataLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authenticate);
router.use(dataLimiter);

router.get('/',                   TransactionController.list);
router.get('/tags',               TransactionController.tags);
router.get('/export/csv',         TransactionController.exportCSV);
router.get('/:id',                TransactionController.getById);
router.get('/:id/history',        TransactionController.getHistory);
router.get('/:id/attachment',     TransactionController.getAttachment);
router.post('/',                   TransactionController.create);
router.post('/bulk',              TransactionController.bulkCreate);
router.post('/:id/attachment',    upload.single('file'), TransactionController.uploadAttachment);
router.put('/:id',                TransactionController.update);
router.delete('/:id',             TransactionController.remove);

export default router;
