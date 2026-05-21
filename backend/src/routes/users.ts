import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/me',  UserController.getProfile);
router.put('/me',  UserController.updateProfile);

export default router;
