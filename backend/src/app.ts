import './config/env';
import { logger } from './config/logger';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { connectDatabase, isDbReady } from './config/database';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes        from './routes/auth';
import authGoogleRoutes  from './routes/authGoogle';
import transactionRoutes from './routes/transactions';
import categoryRoutes    from './routes/categories';
import goalRoutes        from './routes/goals';
import reportRoutes      from './routes/reports';
import userRoutes        from './routes/users';
import twoFactorRoutes   from './routes/twoFactor';
import aiRoutes          from './routes/ai';
import telegramRoutes    from './routes/telegram';
import adminRoutes       from './routes/admin';

const app = express();

// Segurança e performance
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

// Health check detalhado — útil para uptime monitoring e diagnóstico
app.get('/health', (_req, res) => {
  const dbReady = isDbReady();
  const status  = dbReady ? 'ok' : 'starting';
  const code    = dbReady ? 200 : 503;
  res.status(code).json({
    status,
    version: '1.3.0', // refresh token só por hash + rotação (marcador p/ verificar o build em prod)
    db:      dbReady ? 'connected' : 'connecting',
    email:   env.BREVO_API_KEY || env.SMTP_HOST ? 'configured' : 'not_configured',
    ai:      env.GROQ_API_KEY ? 'configured' : 'not_configured',
    telegram:env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Retorna 503 para rotas de API enquanto o banco não estiver pronto
app.use('/api', (req, res, next) => {
  if (!isDbReady()) {
    res.status(503).json({ success: false, message: 'Serviço iniciando, tente novamente em instantes.' });
    return;
  }
  next();
});

// Anexos NÃO são mais servidos publicamente (express.static removido).
// O acesso passa por GET /api/transactions/:id/attachment, que valida o dono.

// Rotas da API
app.use('/api/auth',         authRoutes);
app.use('/api/auth',         authGoogleRoutes);
app.use('/api/auth/2fa',     twoFactorRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/telegram',      telegramRoutes);
app.use('/api/admin',         adminRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// Handler de erros (deve ser o último middleware)
app.use(errorHandler);

async function start(): Promise<void> {
  // Abre a porta PRIMEIRO para o Render detectar o processo
  // A conexão com o banco é feita em background para não bloquear o bind
  app.listen(env.PORT, () => {
    logger.info('Servidor iniciado', { port: env.PORT, env: env.NODE_ENV });
  });

  // Conecta ao banco após abrir a porta (evita timeout do Render)
  try {
    await connectDatabase();
    logger.info('Banco de dados conectado');
  } catch (err) {
    logger.error('Falha ao conectar ao banco de dados', { error: (err as Error).message });
    process.exit(1);
  }

  // Registrar webhook do Telegram após tudo estar pronto
  if (env.NODE_ENV === 'production' && (env as any).TELEGRAM_BOT_TOKEN && (env as any).BACKEND_URL) {
    const { registerWebhook } = await import('./services/telegramService');
    const webhookUrl = `${(env as any).BACKEND_URL}/api/telegram/webhook`;
    const ok = await registerWebhook(webhookUrl, (env as any).TELEGRAM_WEBHOOK_SECRET);
    console.log(`🤖 Telegram webhook ${ok ? 'registrado' : 'FALHOU'}: ${webhookUrl}`);
  }
}

start().catch((err) => {
  logger.error('Falha ao iniciar servidor', { error: String(err) });
  process.exit(1);
});

export default app;
