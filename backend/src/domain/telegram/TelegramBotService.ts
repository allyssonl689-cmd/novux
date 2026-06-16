/**
 * Regras de negócio do bot Telegram.
 * O TelegramController delega toda a lógica para cá — ele só coordena request/response.
 */
import { TelegramModel } from '../../models/TelegramModel';
import { TransactionModel } from '../../models/TransactionModel';
import { GoalModel } from '../../models/GoalModel';
import { parseTransaction, ParsedTransaction } from '../../parsers/transactionParser';
import {
  sendMessage, sendConfirmation, removeKeyboard,
  answerCallback, fmtBRL,
} from '../../services/telegramService';
import { db } from '../../config/database';

/* ─── Tipos do Update do Telegram ─── */
export interface TgUser    { id: number; first_name: string; username?: string }
export interface TgMessage {
  message_id: number;
  from: TgUser;
  chat: { id: number };
  text?: string;
}
export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message: TgMessage;
  data?: string;
}
export interface TgUpdate {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

/* ─── Helpers de persistência de confirmações no banco ─── */
async function savePending(chatId: number, userId: string, parsed: ParsedTransaction): Promise<void> {
  await db.query(
    `INSERT INTO pending_telegram_tx (chat_id, user_id, parsed_data)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_id) DO UPDATE SET user_id = $2, parsed_data = $3, expires_at = NOW() + INTERVAL '10 minutes'`,
    [chatId, userId, JSON.stringify(parsed)]
  );
}

async function getPending(chatId: number): Promise<{ parsed: ParsedTransaction; userId: string } | null> {
  const { rows } = await db.query<{ user_id: string; parsed_data: ParsedTransaction }>(
    `SELECT user_id, parsed_data FROM pending_telegram_tx WHERE chat_id = $1 AND expires_at > NOW()`,
    [chatId]
  );
  if (!rows[0]) return null;
  return { userId: rows[0].user_id, parsed: rows[0].parsed_data };
}

async function deletePending(chatId: number): Promise<void> {
  await db.query(`DELETE FROM pending_telegram_tx WHERE chat_id = $1`, [chatId]);
}

/* ─── Formatação ─── */
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function summaryText(p: ParsedTransaction): string {
  const arrow   = p.type === 'income' ? '🟢 Receita' : '🔴 Despesa';
  const today   = new Date().toISOString().split('T')[0];
  const dateLine = p.date === today ? 'hoje' : formatDate(p.date);
  const rec     = p.recurrence === 'monthly'
    ? `\n🔁 *Recorrência:* mensal por ${p.recurrence_months} meses`
    : '';
  const status  = p.paid ? '✅ Pago/recebido' : '⏳ Em aberto (não pago)';
  return (
    `${arrow}: *${fmtBRL(p.value)}*\n` +
    `📂 *Categoria:* ${p.category}\n` +
    `📝 *Descrição:* ${p.description}\n` +
    `📅 *Data:* ${dateLine}${rec}\n` +
    `${status}`
  );
}

/* ─── Handlers de comando ─── */
export async function handleStart(chatId: number, firstName: string): Promise<void> {
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

export async function handleHelp(chatId: number): Promise<void> {
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

export async function handleConectar(chatId: number, tgUser: TgUser, token: string): Promise<void> {
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

export async function handleDesconectar(chatId: number, userId: string): Promise<void> {
  await TelegramModel.unlink(userId);
  await sendMessage(chatId, '✅ Conta desvinculada. Seus dados no Novux foram mantidos.\n\nUse `/conectar CODIGO` para vincular novamente.');
}

export async function handleSaldo(chatId: number, userId: string): Promise<void> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const summary  = await TransactionModel.getSummary(userId, start, end);
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  await sendMessage(
    chatId,
    `💰 *Saldo (caixa) — ${monthName}*\n\n` +
    `🟢 Recebido: *${fmtBRL(summary.realizedIncome)}*\n` +
    `🔴 Pago:        *${fmtBRL(summary.realizedExpenses)}*\n` +
    `─────────────────\n` +
    `${summary.balance >= 0 ? '✅' : '⚠️'} Saldo:      *${fmtBRL(summary.balance)}*` +
    ((summary.pendingIncome > 0 || summary.pendingExpenses > 0)
      ? `\n\n⏳ _A receber: ${fmtBRL(summary.pendingIncome)} · Em aberto: ${fmtBRL(summary.pendingExpenses)}_`
      : '')
  );
}

export async function handleExtrato(chatId: number, userId: string): Promise<void> {
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

export async function handleMetas(chatId: number, userId: string): Promise<void> {
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

export async function handleResumo(chatId: number, userId: string): Promise<void> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [summary, categories, goals] = await Promise.all([
    TransactionModel.getSummary(userId, start, end),
    TransactionModel.getCategoryBreakdown(userId, start, end),
    GoalModel.findAll(userId),
  ]);

  const monthName    = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const topCats      = (categories as Array<{ category: string; total: string; type: string }>)
    .filter(c => c.type === 'expense')
    .slice(0, 4)
    .map(c => `  • ${c.category}: *${fmtBRL(Number(c.total))}*`)
    .join('\n');
  // Taxa de poupança em regime de caixa: saldo realizado sobre o que foi recebido
  const savingsRate  = summary.realizedIncome > 0
    ? ((summary.balance / summary.realizedIncome) * 100).toFixed(1)
    : '0';
  const activeGoals  = (goals ?? []).filter((g: any) => !g.is_completed);
  const goalsLine    = activeGoals.length > 0
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
    `${summary.balance >= 0 ? '✅' : '⚠️'} Saldo (caixa): *${fmtBRL(summary.balance)}*\n\n` +
    (topCats ? `📂 *Top despesas:*\n${topCats}` : '') +
    goalsLine
  );
}

export async function handleFreeText(chatId: number, userId: string, text: string): Promise<void> {
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

  await savePending(chatId, userId, parsed);

  const confidence = parsed.confidence === 'low'
    ? '\n\n⚠️ _Verifique os dados antes de confirmar._'
    : '';
  const typeEmoji  = parsed.type === 'income' ? '📈' : '📉';

  await sendConfirmation(
    chatId,
    `${typeEmoji} *Novo lançamento detectado:*\n\n${summaryText(parsed)}${confidence}\n\nConfirmar?`,
    `tx:${chatId}`
  );
}

export async function handleCallback(update: TgCallbackQuery): Promise<void> {
  const chatId    = update.message.chat.id;
  const messageId = update.message.message_id;
  const data      = update.data ?? '';

  await answerCallback(update.id);
  await removeKeyboard(chatId, messageId);

  if (data === 'cancel') {
    await deletePending(chatId);
    await sendMessage(chatId, '❌ Lançamento cancelado.');
    return;
  }

  if (data.startsWith('confirm:')) {
    const pending = await getPending(chatId);
    if (!pending) {
      await sendMessage(chatId, '⚠️ Sessão expirada. Envie a mensagem novamente.');
      return;
    }

    const { parsed, userId } = pending;
    await deletePending(chatId);
    const today  = new Date().toISOString().split('T')[0];
    const txDate = parsed.date || today;

    try {
      if (parsed.recurrence === 'monthly' && parsed.recurrence_months > 1) {
        const [baseY, baseM, baseD] = txDate.split('-').map(Number);
        const items = Array.from({ length: parsed.recurrence_months }, (_, i) => {
          const targetMonth = ((baseM - 1 + i) % 12) + 1;
          const targetYear  = baseY + Math.floor((baseM - 1 + i) / 12);
          const lastDay     = new Date(targetYear, targetMonth, 0).getDate();
          const day         = Math.min(baseD, lastDay);
          const dateStr     = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return {
            type: parsed.type, value: parsed.value, category: parsed.category,
            date: dateStr, description: parsed.description,
            recurrence: 'monthly', recurrence_months: parsed.recurrence_months,
            is_recurring: i > 0, paid: parsed.paid, tags: [], currency: 'BRL',
          };
        });
        // Atômico: ou todos os lançamentos mensais são criados, ou nenhum.
        await TransactionModel.createMany(userId, items as any);
        await sendMessage(chatId, `✅ *${parsed.recurrence_months} lançamentos mensais criados!*\n\n${summaryText(parsed)}`);
      } else {
        await TransactionModel.create(userId, {
          type: parsed.type, value: parsed.value, category: parsed.category,
          date: txDate, description: parsed.description,
          recurrence: 'none', is_recurring: false,
          paid: parsed.paid, tags: [], currency: 'BRL',
        } as any);
        await sendMessage(chatId, `✅ *Lançamento registrado!*\n\n${summaryText(parsed)}`);
      }
    } catch (err) {
      console.error('Telegram create transaction error:', err);
      await sendMessage(chatId, '❌ Erro ao salvar o lançamento. Tente novamente.');
    }
  }
}
