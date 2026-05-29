import { db } from '../config/database';
import crypto from 'crypto';

export interface TelegramLink {
  id: string;
  user_id: string;
  chat_id: number;
  username?: string;
  linked_at: string;
}

export class TelegramModel {
  /** Busca vínculo pelo chat_id do Telegram */
  static async findByChatId(chatId: number): Promise<TelegramLink | null> {
    const { rows } = await db.query<TelegramLink>(
      'SELECT * FROM telegram_links WHERE chat_id = $1',
      [chatId]
    );
    return rows[0] ?? null;
  }

  /** Busca vínculo pelo user_id do Novux */
  static async findByUserId(userId: string): Promise<TelegramLink | null> {
    const { rows } = await db.query<TelegramLink>(
      'SELECT * FROM telegram_links WHERE user_id = $1',
      [userId]
    );
    return rows[0] ?? null;
  }

  /** Vincula chat_id ao user_id */
  static async link(userId: string, chatId: number, username?: string): Promise<TelegramLink> {
    const { rows } = await db.query<TelegramLink>(
      `INSERT INTO telegram_links (user_id, chat_id, username)
       VALUES ($1, $2, $3)
       ON CONFLICT (chat_id) DO UPDATE SET user_id = $1, username = $3
       RETURNING *`,
      [userId, chatId, username ?? null]
    );
    return rows[0];
  }

  /** Remove o vínculo de um usuário */
  static async unlink(userId: string): Promise<boolean> {
    const { rowCount } = await db.query(
      'DELETE FROM telegram_links WHERE user_id = $1',
      [userId]
    );
    return (rowCount ?? 0) > 0;
  }

  /** Gera token temporário para vincular conta (10 min) */
  static async createLinkToken(userId: string): Promise<string> {
    // Invalida tokens anteriores não usados
    await db.query(
      'UPDATE telegram_link_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [userId]
    );

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await db.query(
      `INSERT INTO telegram_link_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    return token;
  }

  /** Valida e consume um token de vinculação */
  static async consumeLinkToken(token: string): Promise<string | null> {
    const { rows } = await db.query<{ user_id: string; expires_at: string; used: boolean }>(
      'SELECT user_id, expires_at, used FROM telegram_link_tokens WHERE token = $1',
      [token]
    );

    const row = rows[0];
    if (!row) return null;
    if (row.used) return null;
    if (new Date(row.expires_at) < new Date()) return null;

    await db.query(
      'UPDATE telegram_link_tokens SET used = TRUE WHERE token = $1',
      [token]
    );

    return row.user_id;
  }
}
