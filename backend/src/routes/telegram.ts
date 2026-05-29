import { Router, Request, Response, NextFunction } from 'express';
import { TelegramController } from '../controllers/telegramController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * Webhook — chamado pelo Telegram a cada mensagem.
 * NÃO usa authenticate (é o Telegram chamando, não o usuário).
 * Validação feita via X-Telegram-Bot-Api-Secret-Token.
 */
function validateWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers['x-telegram-bot-api-secret-token'];
    if (header !== secret) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
  }
  next();
}

router.post('/webhook', validateWebhookSecret, TelegramController.webhook);

/* Rotas autenticadas (frontend) */
router.get('/status',        authenticate, TelegramController.status);
router.post('/link-token',   authenticate, TelegramController.generateLinkToken);
router.delete('/unlink',     authenticate, TelegramController.unlink);

export default router;
