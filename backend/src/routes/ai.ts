import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authMiddleware';
import { AIController } from '../controllers/aiController';

const router = Router();

// Dedicated limiter for AI chat: max 30 req/min per IP (protects Groq quota)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições para a IA. Aguarde um momento.' },
});

router.use(authenticate);
router.post('/chat',  aiLimiter, AIController.chat);
router.get('/usage',  AIController.usage);

export default router;
