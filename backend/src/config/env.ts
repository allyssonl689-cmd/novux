import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_ROUNDS: z.coerce.number().default(12),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // false por padrão para compatibilidade com Supabase Session Pooler (cert auto-assinado)
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.coerce.boolean().default(false),

  GOOGLE_CLIENT_ID: z.string().min(10, 'GOOGLE_CLIENT_ID inválido').optional(),

  GROQ_API_KEY: z.string().optional(),

  // E-mail via Brevo API (recomendado — não usa SMTP, não é bloqueado por cloud)
  BREVO_API_KEY: z.string().optional(),
  // E-mail do remetente verificado no Brevo
  EMAIL_FROM: z.string().default('Novux Finance <allyssonl689@gmail.com>'),

  // E-mail (SMTP) — fallback, mantido para compatibilidade
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // URL do frontend — usada para gerar links nos e-mails
  FRONTEND_URL: z.string().default('https://novux-export.vercel.app'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  BACKEND_URL: z.string().optional(), // ex: https://novux.onrender.com

  // Chave de criptografia AES-256 — 64 caracteres hex (32 bytes)
  // Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY deve ter exatamente 64 caracteres hex'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
