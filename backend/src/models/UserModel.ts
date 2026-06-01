import { db } from '../config/database';
import { User, PublicUser } from './types';
import { encrypt, decrypt, emailHmac } from '../utils/encryption';

function decryptUser(row: any): PublicUser {
  return {
    ...row,
    name:  decrypt(row.name),
    email: decrypt(row.email),
  };
}

export class UserModel {
  static async findById(id: string): Promise<PublicUser | null> {
    const { rows } = await db.query<any>(
      `SELECT id, name, email, avatar_url, is_active, plan,
              COALESCE(email_verified, false) AS email_verified,
              created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return null;
    return decryptUser(rows[0]);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const hash = emailHmac(email);
    const { rows } = await db.query<any>(
      'SELECT * FROM users WHERE email_hash = $1 AND is_active = true',
      [hash]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      name:  decrypt(rows[0].name),
      email: decrypt(rows[0].email),
    } as User;
  }

  static async create(data: { name: string; email: string; password_hash: string }): Promise<PublicUser> {
    const encryptedName  = encrypt(data.name);
    const encryptedEmail = encrypt(data.email.toLowerCase());
    const hash           = emailHmac(data.email);

    const { rows } = await db.query<any>(
      `INSERT INTO users (name, email, email_hash, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, avatar_url, is_active, created_at, updated_at`,
      [encryptedName, encryptedEmail, hash, data.password_hash]
    );
    return decryptUser(rows[0]);
  }

  static async update(id: string, data: Partial<{ name: string; avatar_url: string }>): Promise<PublicUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(encrypt(data.name));
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatar_url);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await db.query<any>(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, avatar_url, is_active, created_at, updated_at`,
      values
    );
    if (!rows[0]) return null;
    return decryptUser(rows[0]);
  }

  static async emailExists(email: string): Promise<boolean> {
    const hash = emailHmac(email);
    const { rows } = await db.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [hash]
    );
    return rows.length > 0;
  }

  static async getMetrics(): Promise<{
    total: number; active30d: number; newThisMonth: number;
    plans: Record<string, number>;
  }> {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') AS active30d,
        COUNT(*) FILTER (WHERE created_at > DATE_TRUNC('month', NOW())) AS new_this_month,
        COUNT(*) FILTER (WHERE plan = 'free')                      AS free_count,
        COUNT(*) FILTER (WHERE plan = 'premium')                   AS premium_count
      FROM users WHERE is_active = true
    `);
    const r = rows[0] as any;
    return {
      total:        parseInt(r.total, 10),
      active30d:    parseInt(r.active30d, 10),
      newThisMonth: parseInt(r.new_this_month, 10),
      plans: { free: parseInt(r.free_count, 10), premium: parseInt(r.premium_count, 10) },
    };
  }

  static async listAll(limit = 50, offset = 0): Promise<any[]> {
    const { rows } = await db.query<any>(
      `SELECT id, name, email, plan, is_admin, onboarding_completed, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map(r => ({ ...r, name: decrypt(r.name), email: decrypt(r.email) }));
  }

  static async getReferralStats(userId: string): Promise<{ code: string; count: number }> {
    const { rows } = await db.query<{ referral_code: string; count: string }>(
      `SELECT u.referral_code,
              (SELECT COUNT(*) FROM users WHERE referred_by = u.referral_code) AS count
       FROM users u WHERE u.id = $1`,
      [userId]
    );
    return { code: rows[0]?.referral_code ?? '', count: parseInt(rows[0]?.count ?? '0', 10) };
  }

  static async completeOnboarding(userId: string): Promise<void> {
    await db.query('UPDATE users SET onboarding_completed = TRUE WHERE id = $1', [userId]);
  }

  static async verifyEmail(userId: string): Promise<void> {
    await db.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [userId]);
  }
}
