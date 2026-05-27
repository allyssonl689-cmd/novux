import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.get('/',                   TransactionController.list);
router.get('/export/csv',         TransactionController.exportCSV);
router.get('/:id',                TransactionController.getById);
router.get('/:id/history',        TransactionController.getHistory);
router.post('/',                   TransactionController.create);
router.post('/:id/attachment',    upload.single('file'), TransactionController.uploadAttachment);
router.put('/:id',                TransactionController.update);
router.delete('/:id',             TransactionController.remove);

export default router;
