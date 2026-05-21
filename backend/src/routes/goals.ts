import { Router } from 'express';
import { GoalController } from '../controllers/goalController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/',       GoalController.list);
router.get('/:id',    GoalController.getById);
router.post('/',      GoalController.create);
router.put('/:id',    GoalController.update);
router.delete('/:id', GoalController.remove);

export default router;
