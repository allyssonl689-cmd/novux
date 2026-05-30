import { Request, Response } from 'express';
import { TelegramModel } from '../models/TelegramModel';
import { TransactionModel } from '../models/TransactionModel';
import { GoalModel } from '../models/GoalModel';
import { parseTransaction, ParsedTransaction } from '../parsers/transactionParser';
import {
  sendMessage, sendConfirmation, removeKeyboard,
  answerCallback, fmtBRL,
} from '../services/telegramService';
import { db } from '../config/database';

/* ─── Tipos do Update do Telegram ─── */
interface TgUser { id: number; first_name: string; username?: string }
interface TgMessage {
  message_id: number;
  from: TgUser;
  chat: { id: number };
  text?: string;
}
interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message: TgMessage;
  data?: string;
}
interface TgUpdate {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

/* ─── Cache temporário de transações pendentes de confirmação ─── */
/* chatId → { parsed, userId } */
const pendingConfirmations = new Map<number, { parsed: ParsedTransaction; userId: string }>();

/* ─── Helpers de formatação ─── */
function typeEmoji(type: 'income' | 'expense') {
  return type === 'income' ? '📈' : '📉';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function summaryText(p: ParsedTransaction): string {
  const arrow  = p.type === 'income' ? '🟢 Receita' : '🔴 Despesa';
  const today  = new Date().toISOString().split('T')[0];
  const isToday = p.date === today;
  const dateLine = isToday ? 'hoje' : formatDate(p.date);
  const rec    = p.recurrence === 'monthly'
    ? `\n🔁 *Recorrência:* mensal por ${p.recurrence_months} meses`
    : '';
  const status = p.paid ? '✅ Pago/recebido' : '⏳ Em aberto (não pago)';
  return (
    `${arrow}: *${fmtBRL(p.value)}*\n` +
    `📂 *Categoria:* ${p.category}\n` +
    `📝 *Descrição:* ${p.description}\n` +
    `📅 *Data:* ${dateLine}${rec}\n` +
    `${status}`
  );
}

/* ─── Comandos ─── */
async function handleStart(chatId: number, firstName: string): Promise<void> {
  await sendMessage(
    chatId,
    `👋 Olá, *${firstName}*! Bem-vindo ao *Novux Finance Bot*.\n\n` +
    `Para começar, vincule sua conta:\n` +
    `1. Abra o Novux no navegador\n` +
    `2. Vá em *Perfil → Conectar Telegram*\n` +
    `3. Copie o código e envie aqui: \`/conectar SEU_CODIGO\`\n\n` +
    `📌 Use /ajuda para ver todos os comandos.`
  );
}

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    `🤖 *Novux Finance Bot* — Guia completo\n\n` +
    `💬 *Registrar transação* — escreva naturalmente:\n` +
    `_"Gastei 89,90 no mercado"_\n` +
    `_"Recebi 3000 de salário"_\n` +
    `_"Netflix 55 todo mês"_\n` +
    `_"Conta de luz 180 vencimento 05/06"_\n` +
    `_"Paguei 250 de academia ontem"_\n\n` +
    `📅 *Datas suportadas:*\n` +
    `• "vencimento 05/06" → salva na data certa\n` +
    `• "amanhã", "ontem", "semana que vem"\n` +
    `• "dia 15" → próximo dia 15\n\n` +
    `📊 *Consultas:*\n` +
    `/saldo — Saldo do mês atual\n` +
    `/extrato — Últimas 8 transações\n` +
    `/resumo — Resumo do mês + metas\n` +
    `/metas — Progresso de todas as metas\n\n` +
    `⚙️ *Conta:*\n` +
    `/conectar CODIGO — Vincular conta Novux\n` +
    `/desconectar — Desvincular conta\n` +
    `/ajuda — Esta mensagem`
  );
}

async function handleConectar(chatId: number, tgUser: TgUser, token: string): Promise<void> {
  if (!token) {
    await sendMessage(chatId, '⚠️ Use: `/conectar SEU_CODIGO`\n\nGere o código em *Novux → Perfil → Conectar Telegram*.');
    return;
  }

  const userId = await TelegramModel.consumeLinkToken(token);
  if (!userId) {
    await sendMessage(chatId, '❌ Código inválido ou expirado.\n\nGere um novo código no Novux.');
    return;
  }

  await TelegramModel.link(userId, chatId, tgUser.username);
  await sendMessage(
    chatId,
    `✅ *Conta vinculada com sucesso!*\n\n` +
    `Agora você pode registrar transações simplesmente escrevendo aqui.\n` +
    `Exemplo: _"Gastei 50 no almoço"_\n\n` +
    `Use /ajuda para ver todos os comandos.`
  );
}

async function handleDesconectar(chatId: number, userId: string): Promise<void> {
  await TelegramModel.unlink(userId);
  await sendMessage(chatId, '✅ Conta desvinculada. Seus dados no Novux foram mantidos.\n\nUse `/conectar CODIGO` para vincular novamente.');
}

async function handleSaldo(chatId: number, userId: string): Promise<void> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const summary = await TransactionModel.getSummary(userId, start, end);
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  await sendMessage(
    chatId,
    `💰 *Saldo — ${monthName}*\n\n` +
    `🟢 Receitas:  *${fmtBRL(summary.totalIncome)}*\n` +
    `🔴 Despesas: *${fmtBRL(summary.totalExpenses)}*\n` +
    `─────────────────\n` +
    `${summary.balance >= 0 ? '✅' : '⚠️'} Saldo:      *${fmtBRL(summary.balance)}*`
  );
}

async function handleExtrato(chatId: number, userId: string): Promise<void> {
  const result = await TransactionModel.findAll(userId, { limit: 8 });

  if (result.data.length === 0) {
    await sendMessage(chatId, '📭 Nenhuma transação registrada ainda.\n\nUse /ajuda para ver como registrar.');
    return;
  }

  const lines = result.data.map(t => {
    const emoji  = t.type === 'income' ? '🟢' : '🔴';
    const date   = new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const status = t.paid === false ? ' ⏳' : '';
    return `${emoji} ${date} — ${t.description} — *${fmtBRL(Number(t.value))}*${status}`;
  });

  await sendMessage(chatId, `📋 *Últimas ${result.data.length} transações:*\n_(⏳ = em aberto)_\n\n${lines.join('\n')}`);
}

async function handleMetas(chatId: number, userId: string): Promise<void> {
  const goals = await GoalModel.findAll(userId);

  if (!goals || goals.length === 0) {
    await sendMessage(chatId, '🎯 Você não tem metas cadastradas ainda.\n\nCrie suas metas no app Novux Finance.');
    return;
  }

  const lines = goals.map(g => {
    const current = Number(g.current_value);
    const target  = Number(g.target_value);
    const pct     = target > 0 ? Math.round((current / target) * 100) : 0;
    const bar     = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    const status  = g.is_completed ? '✅' : pct >= 75 ? '🔥' : pct >= 50 ? '💪' : '⏳';
    const deadline = g.deadline
      ? ` | prazo: ${new Date(g.deadline + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
      : '';
    return `${status} *${g.title}*\n\`${bar}\` ${pct}%\n${fmtBRL(current)} de ${fmtBRL(target)}${deadline}`;
  });

  await sendMessage(chatId, `🎯 *Suas Metas Financeiras:*\n\n${lines.join('\n\n')}`);
}

async function handleResumo(chatId: number, userId: string): Promise<void> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [summary, categories, goals] = await Promise.all([
    TransactionModel.getSummary(userId, start, end),
    TransactionModel.getCategoryBreakdown(userId, start, end),
    GoalModel.findAll(userId),
  ]);

  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const topCats = (categories as Array<{ category: string; total: string; type: string }>)
    .filter(c => c.type === 'expense')
    .slice(0, 4)
    .map(c => `  • ${c.category}: *${fmtBRL(Number(c.total))}*`)
    .join('\n');

  const savingsRate = summary.totalIncome > 0
    ? ((summary.balance / summary.totalIncome) * 100).toFixed(1)
    : '0';

  // Metas em andamento
  const activeGoals = (goals ?? []).filter((g: any) => !g.is_completed);
  const goalsLine   = activeGoals.length > 0
    ? `\n\n🎯 *Metas em andamento:* ${activeGoals.length}\n` +
      activeGoals.slice(0, 2).map((g: any) => {
        const pct = Number(g.target_value) > 0 ? Math.round((Number(g.current_value) / Number(g.target_value)) * 100) : 0;
        return `  • ${g.title}: ${pct}%`;
      }).join('\n')
    : '';

  await sendMessage(
    chatId,
    `📊 *Resumo — ${monthName}*\n\n` +
    `🟢 Receitas:  *${fmtBRL(summary.totalIncome)}*\n` +
    `🔴 Despesas: *${fmtBRL(summary.totalExpenses)}*\n` +
    `💾 Poupança: *${savingsRate}%*\n` +
    `${summary.balance >= 0 ? '✅' : '⚠️'} Saldo:      *${fmtBRL(summary.balance)}*\n\n` +
    (topCats ? `📂 *Top despesas:*\n${topCats}` : '') +
    goalsLine
  );
}

/* ─── Processamento de mensagem livre (lançamento) ─── */
async function handleFreeText(chatId: number, userId: string, text: string): Promise<void> {
  const parsed = await parseTransaction(text);

  if (!parsed) {
    await sendMessage(
      chatId,
      `🤔 Não entendi. Tente ser mais específico:\n\n` +
      `_"Gastei 89,90 no mercado"_\n` +
      `_"Recebi 3000 de salário"_\n` +
      `_"Netflix 55 todo mês"_\n\n` +
      `Ou use /ajuda para ver os comandos.`
    );
    return;
  }

  // Armazena para confirmação
  pendingConfirmations.set(chatId, { parsed, userId });

  const preview = summaryText(parsed);
  const confidence = parsed.confidence === 'low'
    ? '\n\n⚠️ _Verifique os dados antes de confirmar._'
    : '';

  await sendConfirmation(
    chatId,
    `${typeEmoji(parsed.type)} *Novo lançamento detectado:*\n\n${preview}${confidence}\n\nConfirmar?`,
    `tx:${chatId}`
  );
}

/* ─── Processamento de callback (botões inline) ─── */
async function handleCallback(update: TgCallbackQuery): Promise<void> {
  const chatId    = update.message.chat.id;
  const messageId = update.message.message_id;
  const data      = update.data ?? '';

  await answerCallback(update.id);
  await removeKeyboard(chatId, messageId);

  if (data === 'cancel') {
    await sendMessage(chatId, '❌ Lançamento cancelado.');
    pendingConfirmations.delete(chatId);
    return;
  }

  if (data.startsWith('confirm:')) {
    const pending = pendingConfirmations.get(chatId);
    if (!pending) {
      await sendMessage(chatId, '⚠️ Sessão expirada. Envie a mensagem novamente.');
      return;
    }

    const { parsed, userId } = pending;
    pendingConfirmations.delete(chatId);

    const today = new Date().toISOString().split('T')[0];

    try {
      // Usa a data extraída pelo parser (pode ser vencimento futuro, ontem, etc.)
      const txDate = parsed.date || today;

      if (parsed.recurrence === 'monthly' && parsed.recurrence_months > 1) {
        // Cria N transações mensais a partir da data extraída
        const [baseY, baseM, baseD] = txDate.split('-').map(Number);
        const promises = Array.from({ length: parsed.recurrence_months }, (_, i) => {
          const targetMonth = ((baseM - 1 + i) % 12) + 1;
          const targetYear  = baseY + Math.floor((baseM - 1 + i) / 12);
          const lastDay     = new Date(targetYear, targetMonth, 0).getDate();
          const day         = Math.min(baseD, lastDay);
          const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return TransactionModel.create(userId, {
            type: parsed.type, value: parsed.value, category: parsed.category,
            date: dateStr, description: parsed.description,
            recurrence: 'monthly', recurrence_months: parsed.recurrence_months,
            is_recurring: i > 0, paid: parsed.paid, tags: [], currency: 'BRL',
          } as any);
        });
        await Promise.all(promises);
        await sendMessage(
          chatId,
          `✅ *${parsed.recurrence_months} lançamentos mensais criados!*\n\n${summaryText(parsed)}`
        );
      } else {
        await TransactionModel.create(userId, {
          type: parsed.type, value: parsed.value, category: parsed.category,
          date: txDate,           // ← data correta (vencimento, ontem, etc.)
          description: parsed.description,
          recurrence: 'none', is_recurring: false,
          paid: parsed.paid, tags: [], currency: 'BRL',
        } as any);
        await sendMessage(
          chatId,
          `✅ *Lançamento registrado!*\n\n${summaryText(parsed)}`
        );
      }
    } catch (err) {
      console.error('Telegram create transaction error:', err);
      await sendMessage(chatId, '❌ Erro ao salvar o lançamento. Tente novamente.');
    }
  }
}

/* ─── Handler principal do webhook ─── */
export class TelegramController {
  static async webhook(req: Request, res: Response): Promise<void> {
    // Responde imediatamente ao Telegram (obrigatório < 10s)
    res.json({ ok: true });

    const update = req.body as TgUpdate;

    try {
      /* ── Callback (clique em botão) ── */
      if (update.callback_query) {
        await handleCallback(update.callback_query);
        return;
      }

      /* ── Mensagem de texto ── */
      const msg = update.message;
      if (!msg?.text) return;

      const chatId    = msg.chat.id;
      const tgUser    = msg.from;
      const text      = msg.text.trim();
      const command   = text.split(' ')[0].toLowerCase();
      const args      = text.slice(command.length).trim();

      /* Comandos sem autenticação */
      if (command === '/start') { await handleStart(chatId, tgUser.first_name); return; }
      if (command === '/ajuda' || command === '/help') { await handleHelp(chatId); return; }
      if (command === '/conectar') { await handleConectar(chatId, tgUser, args); return; }

      /* Verifica vínculo para comandos autenticados */
      const link = await TelegramModel.findByChatId(chatId);
      if (!link) {
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

      /* Texto livre → tentar parsear como transação */
      if (!text.startsWith('/')) {
        await handleFreeText(chatId, userId, text);
      }

    } catch (err) {
      console.error('Telegram webhook error:', err);
    }
  }

  /** Gera token de vinculação para o usuário autenticado */
  static async generateLinkToken(req: Request, res: Response): Promise<void> {
    try {
      const token = await TelegramModel.createLinkToken(req.userId);
      const link  = await TelegramModel.findByUserId(req.userId);
      res.json({ success: true, data: { token, linked: !!link, chatId: link?.chat_id ?? null, username: link?.username ?? null } });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erro ao gerar token' });
    }
  }

  /** Desvincula o Telegram da conta autenticada */
  static async unlink(req: Request, res: Response): Promise<void> {
    try {
      await TelegramModel.unlink(req.userId);
      res.json({ success: true, message: 'Telegram desvinculado' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erro ao desvincular' });
    }
  }

  /** Status do vínculo Telegram */
  static async status(req: Request, res: Response): Promise<void> {
    try {
      const link = await TelegramModel.findByUserId(req.userId);
      res.json({ success: true, data: { linked: !!link, username: link?.username ?? null, linkedAt: link?.linked_at ?? null } });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erro ao verificar status' });
    }
  }
}
