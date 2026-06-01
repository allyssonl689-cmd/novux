import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { authLimiter, refreshLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { bruteForceGuard } from '../middleware/bruteForce';

const router = Router();

router.post('/register',         authLimiter, AuthController.register);
router.post('/login',            authLimiter, bruteForceGuard, AuthController.login);
router.post('/login/2fa',        authLimiter, AuthController.loginWith2FA);
router.post('/refresh',          refreshLimiter, AuthController.refresh);
router.post('/logout',           authenticate, AuthController.logout);
router.post('/change-password',  authenticate, AuthController.changePassword);
router.get('/me',                authenticate, AuthController.me);
router.delete('/account',        authenticate, AuthController.deleteAccount);
router.get('/verify-email',           AuthController.verifyEmail);
router.post('/resend-verification',  authenticate, AuthController.resendVerification);
router.post('/forgot-password',      passwordResetLimiter, AuthController.forgotPassword);
router.post('/reset-password',   passwordResetLimiter, AuthController.resetPassword);

export default router;
