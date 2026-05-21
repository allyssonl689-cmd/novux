import { db } from '../config/database';
import { Category } from './types';

export class CategoryModel {
  static async findAllForUser(userId: string): Promise<Category[]> {
    const { rows } = await db.query<Category>(
      `SELECT * FROM categories
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY is_default DESC, name ASC`,
      [userId]
    );
    return rows;
  }

  static async findById(id: string): Promise<Category | null> {
    const { rows } = await db.query<Category>(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  static async create(userId: string, data: { name: string; type: Category['type']; color?: string; icon?: string }): Promise<Category> {
    const { rows } = await db.query<Category>(
      `INSERT INTO categories (user_id, name, type, color, icon)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data.name, data.type, data.color ?? null, data.icon ?? null]
    );
    return rows[0];
  }

  static async update(id: string, userId: string, data: Partial<{ name: string; type: Category['type']; color: string; icon: string }>): Promise<Category | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
    if (data.type !== undefined) { fields.push(`type = $${paramIndex++}`); values.push(data.type); }
    if (data.color !== undefined) { fields.push(`color = $${paramIndex++}`); values.push(data.color); }
    if (data.icon !== undefined)  { fields.push(`icon = $${paramIndex++}`);  values.push(data.icon); }

    if (fields.length === 0) return this.findById(id);

    values.push(id, userId);
    const { rows } = await db.query<Category>(
      `UPDATE categories SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND is_default = false
       RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await db.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
