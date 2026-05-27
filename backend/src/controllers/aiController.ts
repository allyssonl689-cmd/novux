import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

const FREE_DAILY_LIMIT = 5;

// In-memory daily counter: userId → { date: 'YYYY-MM-DD', count: number }
const usageMap = new Map<string, { date: string; count: number }>();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getUserUsage(userId: string): { date: string; count: number } {
  const today = todayStr();
  const entry = usageMap.get(userId);
  if (!entry || entry.date !== today) {
    const fresh = { date: today, count: 0 };
    usageMap.set(userId, fresh);
    return fresh;
  }
  return entry;
}

export class AIController {
  static async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, context, isPremium } = req.body as {
        message: string;
        context: Record<string, string>;
        isPremium?: boolean;
      };

      if (!message?.trim()) throw new AppError('Mensagem obrigatória', 400);

      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) throw new AppError('Serviço de IA não configurado', 503);

      // Rate limit for non-premium users
      if (!isPremium) {
        const usage = getUserUsage(req.userId);
        if (usage.count >= FREE_DAILY_LIMIT) {
          res.status(429).json({
            success: false,
            code: 'AI_LIMIT_REACHED',
            message: `Você atingiu o limite de ${FREE_DAILY_LIMIT} mensagens gratuitas por dia. Faça upgrade para o plano Pro e tenha conversas ilimitadas com a IA.`,
            remaining: 0,
            resetAt: `${todayStr()}T23:59:59`,
          });
          return;
        }
        usage.count++;
      }

      const systemPrompt = `Voce e NovuxAI, consultor financeiro pessoal inteligente e empatico integrado ao app Novux Finance.
Fale sempre em portugues brasileiro, de forma direta e com dados concretos.
Use emojis com moderacao. Respostas com quebras de linha e listas quando util.
Seja especifico com numeros. De conselhos acionaveis, nao genericos.
Nao invente dados que nao foram fornecidos.

DADOS FINANCEIROS DO USUARIO (mes atual):
${JSON.stringify(context, null, 2)}`;

      const groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 800,
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        }),
      });

      if (!groqRes.ok) {
        // Log only status code — never log full response which may contain API key info
        console.error(`Groq API error: HTTP ${groqRes.status}`);
        throw new AppError('Falha ao conectar com a IA. Tente novamente.', 502);
      }

      const groqData = await groqRes.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = groqData.choices?.[0]?.message?.content ?? 'Não consegui processar. Tente novamente.';

      const usage = getUserUsage(req.userId);
      const remaining = isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - usage.count);

      res.json({ success: true, data: { text, remaining } });
    } catch (err) {
      next(err);
    }
  }

  static async usage(req: Request, res: Response): Promise<void> {
    const usage = getUserUsage(req.userId);
    const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
    res.json({ success: true, data: { used: usage.count, remaining, limit: FREE_DAILY_LIMIT } });
  }
}
