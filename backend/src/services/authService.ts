import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { verifySync } from 'otplib';
import { db } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/auth';
import { UserModel } from '../models/UserModel';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '../validators/authValidators';
import { PublicUser } from '../models/types';
import { recordLoginAttempt } from '../middleware/bruteForce';
import { audit } from './auditService';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

type LoginResult = AuthTokens | { requires2FA: true; tempToken: string };

// short-lived map: tempToken → userId (in-memory, cleared after use or 5min)
const pending2FA = new Map<string, { userId: string; expiresAt: number }>();

export class AuthService {
  static async register(input: RegisterInput, ip?: string): Promise<AuthTokens> {
    const exists = await UserModel.emailExists(input.email);
    if (exists) throw new AppError('Email já cadastrado', 409);

    const password_hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    const user = await UserModel.create({
      name: input.name, email: input.email, password_hash,
    });

    await audit(user.id, 'register', 'account', ip, { name: input.name });
    return this.issueTokens(user);
  }

  static async login(input: LoginInput, ip?: string): Promise<LoginResult> {
    const user = await UserModel.findByEmail(input.email);
    if (!user) {
      await recordLoginAttempt(input.email, ip ?? 'unknown', false);
      await audit(null, 'login_failed', 'account', ip, { email: input.email });
      throw new AppError('Email ou senha inválidos', 401);
    }

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) {
      await recordLoginAttempt(input.email, ip ?? 'unknown', false);
      await audit(user.id, 'login_failed', 'account', ip);
      throw new AppError('Email ou senha inválidos', 401);
    }

    await recordLoginAttempt(input.email, ip ?? 'unknown', true);

    const { rows } = await db.query<{ totp_enabled: boolean }>(
      'SELECT totp_enabled FROM users WHERE id = $1',
      [user.id]
    );
    const totpEnabled = rows[0]?.totp_enabled ?? false;

    if (totpEnabled) {
      const tempToken = randomBytes(32).toString('base64url');
      pending2FA.set(tempToken, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 });
      return { requires2FA: true, tempToken };
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return this.issueTokens(publicUser);
  }

  static async loginWith2FA(tempToken: string, totpToken: string): Promise<AuthTokens> {
    const entry = pending2FA.get(tempToken);
    if (!entry || entry.expiresAt < Date.now()) {
      pending2FA.delete(tempToken);
      throw new AppError('Sessão expirada. Faça login novamente.', 401);
    }

    const { rows } = await db.query<{ id: string; name: string; email: string; avatar_url: string | null; is_active: boolean; created_at: Date; updated_at: Date; totp_secret: string | null }>(
      'SELECT id, name, email, avatar_url, is_active, created_at, updated_at, totp_secret FROM users WHERE id = $1',
      [entry.userId]
    );
    const user = rows[0];
    if (!user || !user.totp_secret) throw new AppError('Usuário não encontrado', 404);

    const result = verifySync({ token: totpToken, secret: user.totp_secret });
    if (!result?.valid) throw new AppError('Código 2FA inválido', 400);

    pending2FA.delete(tempToken);

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
    await audit(publicUser.id, 'login', 'account', undefined);
    return this.issueTokens(publicUser);
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    // Aceita busca por hash (novos) ou token direto (legado)
    const { rows } = await db.query(
      `SELECT id FROM refresh_tokens
       WHERE (token_hash = $1 OR token = $2) AND expires_at > NOW()`,
      [tokenHash, refreshToken]
    );
    if (rows.length === 0) throw new AppError('Refresh token inválido ou expirado', 401);

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    return { accessToken };
  }

  static async logout(refreshToken: string, userId?: string, ip?: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await db.query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1 OR token = $2',
      [tokenHash, refreshToken]
    );
    if (userId) await audit(userId, 'logout', 'account', ip);
  }

  static async deleteAccount(userId: string, ip?: string): Promise<void> {
    await audit(userId, 'delete_account', 'account', ip);
    // CASCADE deleta: transactions, goals, categories, refresh_tokens, telegram_links, audit_log
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  private static async issueTokens(user: PublicUser): Promise<AuthTokens> {
    const payload = { userId: user.id, email: user.email };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const tokenHash    = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshToken, tokenHash, expiresAt]
    );

    return { accessToken, refreshToken, user };
  }
}
