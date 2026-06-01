import { Request, Response } from 'express';
import { TelegramModel } from '../models/TelegramModel';
import {
  TgUpdate,
  handleStart, handleHelp, handleConectar,
  handleDesconectar, handleSaldo, handleExtrato,
  handleMetas, handleResumo, handleFreeText, handleCallback,
} from '../domain/telegram/TelegramBotService';

export class TelegramController {
  static async webhook(req: Request, res: Response): Promise<void> {
    // Responde imediatamente ao Telegram (obrigatório < 10s)
    res.json({ ok: true });

    const update = req.body as TgUpdate;

    try {
      if (update.callback_query) {
        await handleCallback(update.callback_query);
        return;
      }

      const msg = update.message;
      if (!msg?.text) return;

      const chatId  = msg.chat.id;
      const tgUser  = msg.from;
      const text    = msg.text.trim();
      const command = text.split(' ')[0].toLowerCase();
      const args    = text.slice(command.length).trim();

      if (command === '/start')                       { await handleStart(chatId, tgUser.first_name); return; }
      if (command === '/ajuda' || command === '/help') { await handleHelp(chatId);                    return; }
      if (command === '/conectar')                    { await handleConectar(chatId, tgUser, args);   return; }

      const link = await TelegramModel.findByChatId(chatId);
      if (!link) {
        const { sendMessage } = await import('../services/telegramService');
        await sendMessage(
          chatId,
          `🔒 Conta não vinculada.\n\nUse \`/conectar CODIGO\` para começar.\nGere o código em *Novux → Perfil → Conectar Telegram*.`
        );
        return;
      }

      const userId = link.user_id;

      if (command === '/desconectar') { await handleDesconectar(chatId, userId); return; }
      if (command === '/saldo')       { await handleSaldo(chatId, userId);       return; }
      if (command === '/extrato')     { await handleExtrato(chatId, userId);     return; }
      if (command === '/resumo')      { await handleResumo(chatId, userId);      return; }
      if (command === '/metas')       { await handleMetas(chatId, userId);       return; }

      if (!text.startsWith('/')) {
        await handleFreeText(chatId, userId, text);
      }
    } catch (err) {
      console.error('Telegram webhook error:', err);
    }
  }

  static async generateLinkToken(req: Request, res: Response): Promise<void> {
    try {
      const token = await TelegramModel.createLinkToken(req.userId);
      const link  = await TelegramModel.findByUserId(req.userId);
      res.json({ success: true, data: { token, linked: !!link, chatId: link?.chat_id ?? null, username: link?.username ?? null } });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao gerar token' });
    }
  }

  static async unlink(req: Request, res: Response): Promise<void> {
    try {
      await TelegramModel.unlink(req.userId);
      res.json({ success: true, message: 'Telegram desvinculado' });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao desvincular' });
    }
  }

  static async status(req: Request, res: Response): Promise<void> {
    try {
      const link = await TelegramModel.findByUserId(req.userId);
      res.json({ success: true, data: { linked: !!link, username: link?.username ?? null, linkedAt: link?.linked_at ?? null } });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao verificar status' });
    }
  }
}
