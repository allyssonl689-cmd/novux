import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';
import { bruteForceGuard } from '../middleware/bruteForce';

const router = Router();

router.post('/register',         authLimiter, AuthController.register);
router.post('/login',            authLimiter, bruteForceGuard, AuthController.login);
router.post('/login/2fa',        authLimiter, AuthController.loginWith2FA);
router.post('/refresh',          AuthController.refresh); // protegido pelo cookie — sem authLimiter
router.post('/logout',           authenticate, AuthController.logout);
router.post('/change-password',  authenticate, AuthController.changePassword);
router.get('/me',                authenticate, AuthController.me);
router.delete('/account',        authenticate, AuthController.deleteAccount);

export default router;
