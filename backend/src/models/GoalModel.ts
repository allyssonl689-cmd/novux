import { db } from '../config/database';
import { Goal } from './types';

export class GoalModel {
  static async findAll(userId: string): Promise<Goal[]> {
    const { rows } = await db.query<Goal>(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  static async findById(id: string, userId: string): Promise<Goal | null> {
    const { rows } = await db.query<Goal>(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  static async create(userId: string, data: Omit<Goal, 'id' | 'user_id' | 'is_completed' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const { rows } = await db.query<Goal>(
      `INSERT INTO goals (user_id, title, description, target_value, current_value, deadline, category, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, data.title, data.description ?? null, data.target_value, data.current_value ?? 0, data.deadline ?? null, data.category ?? null, data.color ?? null]
    );
    return rows[0];
  }

  static async update(id: string, userId: string, data: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Goal | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updatable: (keyof typeof data)[] = ['title', 'description', 'target_value', 'current_value', 'deadline', 'category', 'color', 'is_completed'];
    for (const key of updatable) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    const { rows } = await db.query<Goal>(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await db.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
