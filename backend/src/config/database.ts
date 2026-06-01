import { Pool } from 'pg';
import { env } from './env';

const isProduction = env.NODE_ENV === 'production';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // SSL sempre ativo em produção — rejectUnauthorized configurável para compatibilidade
  // com Supabase Session Pooler que usa cert auto-assinado (DATABASE_SSL_REJECT_UNAUTHORIZED=false)
  ssl: isProduction
    ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED }
    : false,
  application_name: 'novux-finance',
});

db.on('error', (err) => {
  console.error('Erro inesperado no pool do banco de dados:', err);
  process.exit(1);
});

let _dbReady = false;
export const isDbReady = () => _dbReady;

export async function connectDatabase(): Promise<void> {
  const client = await db.connect();
  client.release();
  _dbReady = true;
  console.log(`✅ Banco de dados conectado (SSL: ${isProduction ? 'ativo' : 'desativado em dev'})`);
}
