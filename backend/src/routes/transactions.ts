import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/',           TransactionController.list);
router.get('/export/csv', TransactionController.exportCSV);
router.get('/:id',        TransactionController.getById);
router.post('/',          TransactionController.create);
router.put('/:id',        TransactionController.update);
router.delete('/:id',     TransactionController.remove);

export default router;
