import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { TelegramController } from '../controllers/telegramController';
import { authenticate } from '../middleware/authMiddleware';
import { env } from '../config/env';

const router = Router();

/**
 * Webhook — chamado pelo Telegram a cada mensagem.
 * NÃO usa authenticate (é o Telegram chamando, não o usuário).
 * Validação feita via X-Telegram-Bot-Api-Secret-Token.
 *
 * Fail-closed: sem `TELEGRAM_WEBHOOK_SECRET` configurado, o webhook fica
 * INDISPONÍVEL (503) — nunca aberto. A comparação é em tempo constante.
 */
function validateWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: 'Webhook do Telegram não configurado' });
    return;
  }

  const header = req.headers['x-telegram-bot-api-secret-token'];
  const received = Buffer.from(Array.isArray(header) ? '' : header ?? '');
  const expected = Buffer.from(secret);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
}

router.post('/webhook', validateWebhookSecret, TelegramController.webhook);

/* Rotas autenticadas (frontend) */
router.get('/status',        authenticate, TelegramController.status);
router.post('/link-token',   authenticate, TelegramController.generateLinkToken);
router.delete('/unlink',     authenticate, TelegramController.unlink);

export default router;
