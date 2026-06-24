import { db, withTransaction, Queryable } from '../config/database';
import { Transaction, PaginatedResult } from './types';
import { encrypt, decrypt } from '../utils/encryption';
import { removeAttachment } from '../services/storageService';

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category?: string;
  categories?: string;       // lista separada por vírgula → match exato (ANY)
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string;
  sort?: 'asc' | 'desc';     // ordenação por data (padrão: desc)
  page?: number;
  limit?: number;
}

/**
 * Linha crua da tabela `transactions` como retorna do banco: igual a `Transaction`
 * mais as colunas que não fazem parte do contrato público (`attachment_url`,
 * `currency`). Os campos `description`/`notes`/`payment_notes` chegam cifrados.
 */
export interface TransactionRow extends Transaction {
  attachment_url: string | null;
  currency: string;
}

function safeDecrypt(value: string): string;
function safeDecrypt(value: string | null): string | null;
function safeDecrypt(value: string | null): string | null {
  if (value == null) return null;
  try {
    return decrypt(value);
  } catch {
    // Fallback para texto puro (dados legados pré-criptografia). Se isto disparar
    // para dados que deveriam estar cifrados, indica ENCRYPTION_KEY errada — não
    // mascaramos mais em silêncio.
    console.warn('[safeDecrypt] valor não pôde ser decifrado — assumindo texto puro (legado ou ENCRYPTION_KEY incorreta)');
    return value;
  }
}

function decryptTx(row: TransactionRow): TransactionRow {
  return {
    ...row,
    description:   safeDecrypt(row.description),
    notes:         safeDecrypt(row.notes),
    payment_notes: safeDecrypt(row.payment_notes ?? null),
  };
}

async function logHistory(
  executor: Queryable,
  transactionId: string,
  userId: string,
  action: 'create' | 'update' | 'delete',
  snapshot: object
) {
  await executor.query(
    `INSERT INTO transaction_history (transaction_id, user_id, action, snapshot)
     VALUES ($1, $2, $3, $4)`,
    [transactionId, userId, action, JSON.stringify(snapshot)]
  );
}

// Campos opcionais na criação (o insert aplica defaults/`null` via insertTx).
type OptionalOnCreate = 'notes' | 'recurrence_months' | 'payment_method' | 'paid_at' | 'payment_notes';
export type NewTransaction =
  Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | OptionalOnCreate>
  & Partial<Pick<Transaction, OptionalOnCreate>>
  & { currency?: string };

// Teto de linhas descriptografadas por busca textual. Como description/notes são
// cifrados (AES-GCM, não pesquisável em SQL), a busca precisa descriptografar e
// filtrar em memória — sem teto, `?search=` força a descriptografia da tabela
// inteira (DoS trivial). A varredura cobre as N transações mais recentes que casam
// com os filtros estruturados (type/category/date/tags), suficiente para o uso real.
const SEARCH_SCAN_LIMIT = 1000;

/**
 * Insere uma transação usando o executor fornecido (pool ou client de transação)
 * e registra o histórico. Não abre transação própria — o chamador decide o escopo
 * atômico (ver `create` / `createMany`).
 */
async function insertTx(executor: Queryable, userId: string, data: NewTransaction): Promise<Transaction> {
  const encDescription  = encrypt(data.description);
  const encNotes        = data.notes ? encrypt(data.notes) : null;
  const encPaymentNotes = data.payment_notes ? encrypt(data.payment_notes) : null;

  const { rows } = await executor.query<TransactionRow>(
    `INSERT INTO transactions
       (user_id, type, value, category, date, description, notes, recurrence, recurrence_months, is_recurring, paid, tags, currency, payment_method, paid_at, payment_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      userId, data.type, data.value, data.category, data.date,
      encDescription, encNotes,
      data.recurrence ?? 'none', data.recurrence_months ?? null,
      data.is_recurring ?? false, data.paid ?? false,
      data.tags ?? [], data.currency ?? 'BRL',
      data.payment_method ?? null, data.paid_at ?? null, encPaymentNotes,
    ]
  );
  const tx = decryptTx(rows[0]);
  await logHistory(executor, tx.id, userId, 'create', tx);
  return tx;
}

export class TransactionModel {
  static async findAll(userId: string, filters: TransactionFilters = {}): Promise<PaginatedResult<TransactionRow>> {
    const { type, category, categories, startDate, endDate, search, tags, sort, page = 1, limit = 50 } = filters;

    // Busca textual: como description/notes são criptografados, filtramos em memória
    // (com teto de varredura — ver SEARCH_SCAN_LIMIT)
    const hasSearch = !!search;
    const orderDir = sort === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['user_id = $1'];
    const values: unknown[]    = [userId];
    let paramIndex = 2;

    if (type)      { conditions.push(`type = $${paramIndex++}`); values.push(type); }
    if (category)  { conditions.push(`category ILIKE $${paramIndex++}`); values.push(`%${category}%`); }
    if (categories) {
      // Múltiplas categorias (seleção exata na UI) → category = ANY(array)
      const list = categories.split(',').map(c => c.trim()).filter(Boolean);
      if (list.length) { conditions.push(`category = ANY($${paramIndex++})`); values.push(list); }
    }
    if (startDate) { conditions.push(`date >= $${paramIndex++}`); values.push(startDate); }
    if (endDate)   { conditions.push(`date <= $${paramIndex++}`); values.push(endDate); }
    if (tags)      { conditions.push(`tags && $${paramIndex++}`); values.push(tags.split(',')); }

    const where = conditions.join(' AND ');

    if (hasSearch) {
      // Aplica os filtros estruturados no SQL e limita a varredura a SEARCH_SCAN_LIMIT
      // linhas (mais recentes primeiro) antes de descriptografar e filtrar por texto.
      // Isso elimina a descriptografia ilimitada (DoS) mantendo a busca por substring.
      const { rows } = await db.query<TransactionRow>(
        `SELECT * FROM transactions WHERE ${where} ORDER BY date ${orderDir}, created_at ${orderDir} LIMIT $${paramIndex}`,
        [...values, SEARCH_SCAN_LIMIT]
      );
      const searchLower = search!.toLowerCase();
      const filtered     = rows.map(decryptTx).filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        (t.notes ?? '').toLowerCase().includes(searchLower)
      );
      const offset = (page - 1) * limit;
      return {
        data:       filtered.slice(offset, offset + limit),
        total:      filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      };
    }

    const offset = (page - 1) * limit;
    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      db.query<TransactionRow>(
        `SELECT * FROM transactions WHERE ${where} ORDER BY date ${orderDir}, created_at ${orderDir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      ),
      db.query<{ count: string }>(`SELECT COUNT(*) FROM transactions WHERE ${where}`, values),
    ]);

    const total = parseInt(countRows[0].count, 10);
    return {
      data:       data.map(decryptTx),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async findById(id: string, userId: string, executor: Queryable = db): Promise<TransactionRow | null> {
    const { rows } = await executor.query<TransactionRow>(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ? decryptTx(rows[0]) : null;
  }

  static async create(userId: string, data: NewTransaction): Promise<Transaction> {
    // Insert + histórico em uma única transação atômica.
    return withTransaction(client => insertTx(client, userId, data));
  }

  /**
   * Cria várias transações de forma atômica (tudo ou nada). Usado pela recorrência
   * mensal: se um dos lançamentos falhar, nenhum é persistido.
   */
  static async createMany(userId: string, items: NewTransaction[]): Promise<Transaction[]> {
    return withTransaction(async client => {
      const created: Transaction[] = [];
      for (const data of items) {
        created.push(await insertTx(client, userId, data));
      }
      return created;
    });
  }

  static async update(id: string, userId: string, data: Partial<Omit<TransactionRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Transaction | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const plainUpdatable  = ['type', 'value', 'category', 'date', 'recurrence', 'recurrence_months', 'is_recurring', 'paid', 'tags', 'attachment_url', 'currency', 'payment_method', 'paid_at'] as const;
    const cryptoUpdatable = ['description', 'notes', 'payment_notes'] as const;

    for (const key of plainUpdatable) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(data[key]);
      }
    }
    for (const key of cryptoUpdatable) {
      const v = data[key];
      if (v !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(v != null ? encrypt(v) : null);
      }
    }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    // Update + histórico em uma única transação atômica.
    return withTransaction(async client => {
      const { rows } = await client.query<TransactionRow>(
        `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
        values
      );
      if (!rows[0]) return null;
      const tx = decryptTx(rows[0]);
      await logHistory(client, id, userId, 'update', tx);
      return tx;
    });
  }

  static async setAttachment(id: string, userId: string, url: string): Promise<Transaction | null> {
    const { rows } = await db.query<TransactionRow>(
      `UPDATE transactions SET attachment_url = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [url, id, userId]
    );
    return rows[0] ? decryptTx(rows[0]) : null;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    // Leitura + histórico + DELETE em uma única transação atômica.
    const { deleted, attachmentUrl } = await withTransaction(async client => {
      const existing = await this.findById(id, userId, client);
      if (existing) await logHistory(client, id, userId, 'delete', existing);
      const { rowCount } = await client.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return {
        deleted: (rowCount ?? 0) > 0,
        attachmentUrl: existing?.attachment_url ?? undefined,
      };
    });

    // Remove o objeto do comprovante somente após o COMMIT (efeito externo
    // não pode ser revertido por ROLLBACK; só apaga se a transação confirmou).
    if (deleted && attachmentUrl) await removeAttachment(attachmentUrl);
    return deleted;
  }

  /** Tags distintas do usuário (catálogo para o filtro da tela de lançamentos). */
  static async getDistinctTags(userId: string): Promise<string[]> {
    const { rows } = await db.query<{ tag: string }>(
      `SELECT DISTINCT unnest(tags) AS tag FROM transactions WHERE user_id = $1 ORDER BY tag`,
      [userId]
    );
    return rows.map(r => r.tag).filter(Boolean);
  }

  static async getHistory(id: string, userId: string) {
    const { rows } = await db.query(
      `SELECT id, action, snapshot, changed_at
       FROM transaction_history
       WHERE transaction_id = $1 AND user_id = $2
       ORDER BY changed_at DESC`,
      [id, userId]
    );
    return rows;
  }

  static async getSummary(userId: string, startDate: string, endDate: string) {
    // Regime de CAIXA: o saldo considera apenas lançamentos realizados (paid = true).
    // Mantemos os totais brutos (realizado + previsto) para exibir a movimentação do
    // período e expomos o desdobramento realizado/pendente para transparência.
    const { rows } = await db.query<{ type: string; total: string; realized: string; count: string }>(
      `SELECT type,
              SUM(value)                                         AS total,
              COALESCE(SUM(value) FILTER (WHERE paid = true), 0) AS realized,
              COUNT(*)                                           AS count
       FROM transactions WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY type`,
      [userId, startDate, endDate]
    );
    const income  = rows.find(r => r.type === 'income');
    const expense = rows.find(r => r.type === 'expense');

    const totalIncome      = parseFloat(income?.total ?? '0');
    const totalExpenses    = parseFloat(expense?.total ?? '0');
    const realizedIncome   = parseFloat(income?.realized ?? '0');
    const realizedExpenses = parseFloat(expense?.realized ?? '0');

    return {
      totalIncome, totalExpenses,
      realizedIncome, realizedExpenses,
      pendingIncome:   totalIncome - realizedIncome,
      pendingExpenses: totalExpenses - realizedExpenses,
      // Saldo em regime de caixa: só o que efetivamente entrou menos o que saiu
      balance:      realizedIncome - realizedExpenses,
      incomeCount:  parseInt(income?.count ?? '0', 10),
      expenseCount: parseInt(expense?.count ?? '0', 10),
    };
  }

  /**
   * Série mensal de TODO o histórico, com desdobramento de status de pagamento.
   * Substitui o cálculo client-side que dependia de carregar todas as transações.
   * Retorna uma linha por mês (YYYY-MM) em ordem cronológica.
   */
  static async getMonthlyBreakdown(userId: string) {
    const { rows } = await db.query<{
      month: string; income: string; expense: string;
      received: string; to_receive: string; paid: string; pending: string;
    }>(
      `SELECT to_char(date, 'YYYY-MM')                                                   AS month,
              COALESCE(SUM(value) FILTER (WHERE type = 'income'),  0)                    AS income,
              COALESCE(SUM(value) FILTER (WHERE type = 'expense'), 0)                    AS expense,
              COALESCE(SUM(value) FILTER (WHERE type = 'income'  AND paid = true), 0)    AS received,
              COALESCE(SUM(value) FILTER (WHERE type = 'income'  AND paid IS NOT TRUE), 0) AS to_receive,
              COALESCE(SUM(value) FILTER (WHERE type = 'expense' AND paid = true), 0)    AS paid,
              COALESCE(SUM(value) FILTER (WHERE type = 'expense' AND paid IS NOT TRUE), 0) AS pending
       FROM transactions WHERE user_id = $1
       GROUP BY month ORDER BY month`,
      [userId]
    );
    return rows.map(r => ({
      month:     r.month,
      income:    parseFloat(r.income),
      expense:   parseFloat(r.expense),
      received:  parseFloat(r.received),
      toReceive: parseFloat(r.to_receive),
      paid:      parseFloat(r.paid),
      pending:   parseFloat(r.pending),
    }));
  }

  static async getMonthlySummary(userId: string, year: number) {
    const { rows } = await db.query(
      `SELECT EXTRACT(MONTH FROM date) as month, type, SUM(value) as total
       FROM transactions WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
       GROUP BY month, type ORDER BY month`,
      [userId, year]
    );
    return rows;
  }

  static async getCategoryBreakdown(userId: string, startDate: string, endDate: string) {
    const { rows } = await db.query(
      `SELECT category, type, SUM(value) as total, COUNT(*) as count
       FROM transactions WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY category, type ORDER BY total DESC`,
      [userId, startDate, endDate]
    );
    return rows;
  }
}
