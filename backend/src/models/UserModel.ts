import { db } from '../config/database';
import { User, PublicUser } from './types';

export class UserModel {
  static async findById(id: string): Promise<PublicUser | null> {
    const { rows } = await db.query<PublicUser>(
      'SELECT id, name, email, avatar_url, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const { rows } = await db.query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    return rows[0] ?? null;
  }

  static async create(data: { name: string; email: string; password_hash: string }): Promise<PublicUser> {
    const { rows } = await db.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, avatar_url, is_active, created_at, updated_at`,
      [data.name, data.email.toLowerCase(), data.password_hash]
    );
    return rows[0];
  }

  static async update(id: string, data: Partial<{ name: string; avatar_url: string }>): Promise<PublicUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatar_url);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await db.query<PublicUser>(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, avatar_url, is_active, created_at, updated_at`,
      values
    );
    return rows[0] ?? null;
  }

  static async emailExists(email: string): Promise<boolean> {
    const { rows } = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return rows.length > 0;
  }
}
