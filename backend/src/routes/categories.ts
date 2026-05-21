import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/',      CategoryController.list);
router.post('/',     CategoryController.create);
router.put('/:id',   CategoryController.update);
router.delete('/:id', CategoryController.remove);

export default router;
