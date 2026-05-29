/**
 * Serviço de envio de mensagens via Telegram Bot API.
 */

const BASE = 'https://api.telegram.org/bot';

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN não configurado');
  return t;
}

async function call(method: string, body: object): Promise<void> {
  const res = await fetch(`${BASE}${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Telegram API ${method} error:`, err);
  }
}

/** Envia mensagem simples */
export async function sendMessage(chatId: number, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
  await call('sendMessage', { chat_id: chatId, text, parse_mode: parseMode });
}

/** Envia mensagem com botões inline de confirmação */
export async function sendConfirmation(
  chatId: number,
  text: string,
  callbackData: string
): Promise<void> {
  await call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Confirmar', callback_data: `confirm:${callbackData}` },
        { text: '❌ Cancelar', callback_data: 'cancel' },
      ]],
    },
  });
}

/** Remove botões de uma mensagem já enviada */
export async function removeKeyboard(chatId: number, messageId: number): Promise<void> {
  await call('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

/** Responde a um callback_query (clique em botão inline) */
export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

/** Registra o webhook junto ao Telegram */
export async function registerWebhook(webhookUrl: string, secret?: string): Promise<boolean> {
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  };
  if (secret) body.secret_token = secret;

  const res = await fetch(`${BASE}${token()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { ok: boolean; description?: string };
  if (!data.ok) console.error('setWebhook error:', data.description);
  return data.ok;
}

/** Formata valor em BRL */
export function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
