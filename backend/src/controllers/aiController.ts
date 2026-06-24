import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Mensagem obrigatória').max(2000, 'Mensagem muito longa'),
  context: z.record(z.string(), z.string()).optional(),
});

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

const FREE_DAILY_LIMIT = 5;
const GROQ_TIMEOUT_MS  = 12_000;     // aborta a chamada à Groq se demorar demais
const MAX_CONTEXT_CHARS = 12_000;    // teto do contexto serializado enviado à IA

/**
 * Determina o plano do usuário a partir do banco — NUNCA confia em flag do cliente.
 * Retorna true se o plano for diferente de 'free'.
 */
async function isUserPremium(userId: string): Promise<boolean> {
  const { rows } = await db.query<{ plan: string }>('SELECT plan FROM users WHERE id = $1', [userId]);
  return (rows[0]?.plan ?? 'free') !== 'free';
}

// Contador diário persistido em `ai_usage` (uma linha por usuário/dia).
// Substitui o Map em memória, que zerava a cada deploy e divergia entre instâncias.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Lê o número de mensagens já usadas pelo usuário no dia (0 se não houver registro). */
async function getUsageCount(userId: string, date: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count FROM ai_usage WHERE user_id = $1 AND usage_date = $2',
    [userId, date]
  );
  return rows[0]?.count ?? 0;
}

/** Incrementa (ou cria) o contador do dia de forma atômica e retorna o novo total. */
async function incrementUsage(userId: string, date: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    `INSERT INTO ai_usage (user_id, usage_date, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, usage_date)
     DO UPDATE SET count = ai_usage.count + 1, updated_at = NOW()
     RETURNING count`,
    [userId, date]
  );
  return rows[0].count;
}

export class AIController {
  static async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, context } = chatSchema.parse(req.body);

      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) throw new AppError('Serviço de IA não configurado', 503);

      // isPremium é derivado do banco (users.plan), nunca do corpo da requisição
      const isPremium = await isUserPremium(req.userId);

      const today = todayStr();
      let usedToday = 0;

      // Rate limit for non-premium users — contador persistido em `ai_usage`
      if (!isPremium) {
        const current = await getUsageCount(req.userId, today);
        if (current >= FREE_DAILY_LIMIT) {
          res.status(429).json({
            success: false,
            code: 'AI_LIMIT_REACHED',
            message: `Você atingiu o limite de ${FREE_DAILY_LIMIT} mensagens gratuitas por dia. Faça upgrade para o plano Pro e tenha conversas ilimitadas com a IA.`,
            remaining: 0,
            resetAt: `${today}T23:59:59`,
          });
          return;
        }
        usedToday = await incrementUsage(req.userId, today);
      }

      // Limita o tamanho do contexto serializado para conter custo/tokens da Groq
      const rawContext = JSON.stringify(context ?? {}, null, 2);
      const contextStr = rawContext.length > MAX_CONTEXT_CHARS
        ? rawContext.slice(0, MAX_CONTEXT_CHARS) + '\n... (contexto truncado)'
        : rawContext;

      const systemPrompt = `Voce e NovuxAI, consultor financeiro pessoal inteligente e empatico do app Novux Finance.
Fale sempre em portugues brasileiro, de forma direta e com dados concretos.
Use emojis com moderacao. Respostas com quebras de linha e listas quando util.
Seja especifico com numeros. De conselhos acionaveis, nao genericos.
Nao invente dados que nao foram fornecidos.

DADOS COMPLETOS DO USUARIO:
- mes_atual: periodo de referencia
- receita_mes_atual / despesa_mes_atual: totais do mes
- receitas_por_categoria: de onde vem o dinheiro
- despesas_por_categoria: onde o dinheiro vai (com percentuais)
- despesas_pendentes_mes: lancamentos ainda nao pagos
- taxa_poupanca: % da renda guardada
- total_investido_historico: total em investimentos no historico
- historico_mensal: resumo mes a mes de toda a historia do usuario
- ultimas_transacoes: 10 lancamentos mais recentes (data|valor|categoria|descricao)
- metas: todas as metas com progresso, prazo e status
- total_metas / metas_concluidas: contagem de metas

Use TODOS esses dados para responder com precisao. Se o usuario perguntar sobre metas, use o campo 'metas'. Se perguntar sobre investimentos, use 'total_investido_historico' e o historico. Se perguntar sobre transacoes especificas, use 'ultimas_transacoes'.

${contextStr}`;

      // Aborta a chamada à Groq se ela exceder o timeout (evita segurar o worker)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
      let groqRes: globalThis.Response;
      try {
        groqRes = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            max_tokens: 1200,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
          }),
          signal: controller.signal,
        });
      } catch {
        throw new AppError('A IA demorou para responder. Tente novamente.', 504);
      } finally {
        clearTimeout(timer);
      }

      if (!groqRes.ok) {
        // Log only status code — never log full response which may contain API key info
        console.error(`Groq API error: HTTP ${groqRes.status}`);
        throw new AppError('Falha ao conectar com a IA. Tente novamente.', 502);
      }

      const groqData = await groqRes.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = groqData.choices?.[0]?.message?.content ?? 'Não consegui processar. Tente novamente.';

      const remaining = isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - usedToday);

      res.json({ success: true, data: { text, remaining } });
    } catch (err) {
      next(err);
    }
  }

  static async usage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const used = await getUsageCount(req.userId, todayStr());
      const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
      res.json({ success: true, data: { used, remaining, limit: FREE_DAILY_LIMIT } });
    } catch (err) {
      next(err);
    }
  }
}
