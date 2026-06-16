import { db, withTransaction, Queryable } from '../config/database';
import { Transaction, PaginatedResult } from './types';
import { encrypt, decrypt } from '../utils/encryption';
import { removeUploadFile } from '../utils/uploads';

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string;
  page?: number;
  limit?: number;
}

function encryptTx(data: Partial<Transaction>): Partial<Transaction> {
  const out = { ...data } as any;
  if (data.description !== undefined) out.description = encrypt(data.description);
  if (data.notes       !== undefined && data.notes !== null) out.notes = encrypt(data.notes);
  return out;
}

function safeDecrypt(value: string): string;
function safeDecrypt(value: string | null): string | null;
function safeDecrypt(value: string | null): string | null {
  if (value == null) return null;
  try { return decrypt(value); } catch { return value; } // fallback para texto puro (legado)
}

function decryptTx(row: any): Transaction {
  return {
    ...row,
    description: safeDecrypt(row.description),
    notes:       safeDecrypt(row.notes),
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

type NewTransaction = Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

/**
 * Insere uma transação usando o executor fornecido (pool ou client de transação)
 * e registra o histórico. Não abre transação própria — o chamador decide o escopo
 * atômico (ver `create` / `createMany`).
 */
async function insertTx(executor: Queryable, userId: string, data: NewTransaction): Promise<Transaction> {
  const encDescription = encrypt(data.description);
  const encNotes       = data.notes ? encrypt(data.notes) : null;

  const { rows } = await executor.query<any>(
    `INSERT INTO transactions
       (user_id, type, value, category, date, description, notes, recurrence, recurrence_months, is_recurring, paid, tags, currency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      userId, data.type, data.value, data.category, data.date,
      encDescription, encNotes,
      data.recurrence ?? 'none', data.recurrence_months ?? null,
      data.is_recurring ?? false, data.paid ?? false,
      data.tags ?? [], (data as any).currency ?? 'BRL',
    ]
  );
  const tx = decryptTx(rows[0]);
  await logHistory(executor, tx.id, userId, 'create', tx);
  return tx;
}

export class TransactionModel {
  static async findAll(userId: string, filters: TransactionFilters = {}): Promise<PaginatedResult<Transaction>> {
    const { type, category, startDate, endDate, search, tags, page = 1, limit = 50 } = filters;

    // Busca textual: como description/notes são criptografados, filtramos em memória
    const hasSearch = !!search;

    const conditions: string[] = ['user_id = $1'];
    const values: unknown[]    = [userId];
    let paramIndex = 2;

    if (type)      { conditions.push(`type = $${paramIndex++}`); values.push(type); }
    if (category)  { conditions.push(`category ILIKE $${paramIndex++}`); values.push(`%${category}%`); }
    if (startDate) { conditions.push(`date >= $${paramIndex++}`); values.push(startDate); }
    if (endDate)   { conditions.push(`date <= $${paramIndex++}`); values.push(endDate); }
    if (tags)      { conditions.push(`tags && $${paramIndex++}`); values.push(tags.split(',')); }

    const where = conditions.join(' AND ');

    if (hasSearch) {
      // Busca textual: busca todas as linhas filtradas (sem paginação SQL) e filtra após decrypt
      const { rows } = await db.query<any>(
        `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC, created_at DESC`,
        values
      );
      const searchLower = search!.toLowerCase();
      const allDecrypted = rows.map(decryptTx);
      const filtered     = allDecrypted.filter(t =>
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
      db.query<any>(
        `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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

  static async findById(id: string, userId: string, executor: Queryable = db): Promise<Transaction | null> {
    const { rows } = await executor.query<any>(
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

  static async update(id: string, userId: string, data: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Transaction | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const plainUpdatable  = ['type', 'value', 'category', 'date', 'recurrence', 'recurrence_months', 'is_recurring', 'paid', 'tags', 'attachment_url', 'currency'] as const;
    const cryptoUpdatable = ['description', 'notes'] as const;

    for (const key of plainUpdatable) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push((data as any)[key]);
      }
    }
    for (const key of cryptoUpdatable) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        const v = (data as any)[key];
        values.push(v != null ? encrypt(v) : null);
      }
    }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    // Update + histórico em uma única transação atômica.
    return withTransaction(async client => {
      const { rows } = await client.query<any>(
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
    const { rows } = await db.query<any>(
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
        attachmentUrl: (existing as any)?.attachment_url as string | undefined,
      };
    });

    // Remove o arquivo de comprovante somente após o COMMIT (efeito em disco
    // não pode ser revertido por ROLLBACK; só apaga se a transação confirmou).
    if (deleted && attachmentUrl) removeUploadFile(attachmentUrl);
    return deleted;
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
