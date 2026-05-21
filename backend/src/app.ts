import './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { connectDatabase } from './config/database';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes        from './routes/auth';
import transactionRoutes from './routes/transactions';
import categoryRoutes    from './routes/categories';
import goalRoutes        from './routes/goals';
import reportRoutes      from './routes/reports';
import userRoutes        from './routes/users';

const app = express();

// Segurança e performance
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth',         authRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/users',         userRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// Handler de erros (deve ser o último middleware)
app.use(errorHandler);

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(env.PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${env.PORT}`);
    console.log(`📦 Ambiente: ${env.NODE_ENV}`);
  });
}

start().catch((err) => {
  console.error('❌ Falha ao iniciar servidor:', err);
  process.exit(1);
});

export default app;
