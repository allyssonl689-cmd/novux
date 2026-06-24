import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

/**
 * Algo capaz de executar queries: o pool (`db`) ou um client de transação.
 * Interface estrutural — tanto `Pool` quanto `PoolClient` são compatíveis.
 */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
}

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
  // Não derruba o processo: erros em clientes ociosos (ex.: queda transitória do
  // Supabase Session Pooler) são recuperáveis — o pool recria as conexões sozinho.
  // Matar o processo aqui causava reinícios desnecessários e indisponibilidade.
  console.error('Erro inesperado no pool do banco de dados (recuperável):', err);
});

/**
 * Executa `fn` dentro de uma transação (BEGIN/COMMIT/ROLLBACK) usando um client
 * dedicado do pool. Em caso de erro, faz ROLLBACK e relança. O client é sempre
 * liberado. Use para operações multi-tabela que precisam ser atômicas.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignora falha no ROLLBACK (ex.: conexão já perdida) — o erro original é o que importa.
    }
    throw err;
  } finally {
    client.release();
  }
}

let _dbReady = false;
export const isDbReady = () => _dbReady;

export async function connectDatabase(): Promise<void> {
  const client = await db.connect();
  client.release();
  _dbReady = true;
  console.log(`✅ Banco de dados conectado (SSL: ${isProduction ? 'ativo' : 'desativado em dev'})`);
}
