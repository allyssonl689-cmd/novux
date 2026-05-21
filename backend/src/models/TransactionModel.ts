import { db } from '../config/database';
import { Transaction, PaginatedResult } from './types';

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class TransactionModel {
  static async findAll(userId: string, filters: TransactionFilters = {}): Promise<PaginatedResult<Transaction>> {
    const { type, category, startDate, endDate, search, page = 1, limit = 50 } = filters;
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (category) {
      conditions.push(`category ILIKE $${paramIndex++}`);
      values.push(`%${category}%`);
    }
    if (startDate) {
      conditions.push(`date >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`date <= $${paramIndex++}`);
      values.push(endDate);
    }
    if (search) {
      conditions.push(`(description ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      db.query<Transaction>(
        `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM transactions WHERE ${where}`,
        values
      ),
    ]);

    const total = parseInt(countRows[0].count, 10);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async findById(id: string, userId: string): Promise<Transaction | null> {
    const { rows } = await db.query<Transaction>(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  static async create(userId: string, data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const { rows } = await db.query<Transaction>(
      `INSERT INTO transactions (user_id, type, value, category, date, description, notes, recurrence, recurrence_months, is_recurring, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        data.type,
        data.value,
        data.category,
        data.date,
        data.description,
        data.notes ?? null,
        data.recurrence ?? 'none',
        data.recurrence_months ?? null,
        data.is_recurring ?? false,
        data.tags ?? [],
      ]
    );
    return rows[0];
  }

  static async update(id: string, userId: string, data: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Transaction | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updatable: (keyof typeof data)[] = [
      'type', 'value', 'category', 'date', 'description',
      'notes', 'recurrence', 'recurrence_months', 'is_recurring', 'tags',
    ];

    for (const key of updatable) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    const { rows } = await db.query<Transaction>(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  static async getSummary(userId: string, startDate: string, endDate: string) {
    const { rows } = await db.query<{ type: string; total: string; count: string }>(
      `SELECT type, SUM(value) as total, COUNT(*) as count
       FROM transactions
       WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY type`,
      [userId, startDate, endDate]
    );

    const income = rows.find(r => r.type === 'income');
    const expense = rows.find(r => r.type === 'expense');
    const totalIncome = parseFloat(income?.total ?? '0');
    const totalExpenses = parseFloat(expense?.total ?? '0');

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      incomeCount: parseInt(income?.count ?? '0', 10),
      expenseCount: parseInt(expense?.count ?? '0', 10),
    };
  }

  static async getMonthlySummary(userId: string, year: number) {
    const { rows } = await db.query(
      `SELECT
         EXTRACT(MONTH FROM date) as month,
         type,
         SUM(value) as total
       FROM transactions
       WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
       GROUP BY month, type
       ORDER BY month`,
      [userId, year]
    );
    return rows;
  }

  static async getCategoryBreakdown(userId: string, startDate: string, endDate: string) {
    const { rows } = await db.query(
      `SELECT category, type, SUM(value) as total, COUNT(*) as count
       FROM transactions
       WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY category, type
       ORDER BY total DESC`,
      [userId, startDate, endDate]
    );
    return rows;
  }
}
