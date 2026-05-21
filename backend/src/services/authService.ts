import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/auth';
import { UserModel } from '../models/UserModel';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '../validators/authValidators';
import { PublicUser } from '../models/types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<AuthTokens> {
    const exists = await UserModel.emailExists(input.email);
    if (exists) throw new AppError('Email já cadastrado', 409);

    const password_hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    const user = await UserModel.create({ name: input.name, email: input.email, password_hash });

    return this.issueTokens(user);
  }

  static async login(input: LoginInput): Promise<AuthTokens> {
    const user = await UserModel.findByEmail(input.email);
    if (!user) throw new AppError('Email ou senha inválidos', 401);

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) throw new AppError('Email ou senha inválidos', 401);

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

  static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = verifyRefreshToken(refreshToken);

    const { rows } = await db.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (rows.length === 0) throw new AppError('Refresh token inválido ou expirado', 401);

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    return { accessToken };
  }

  static async logout(refreshToken: string): Promise<void> {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }

  private static async issueTokens(user: PublicUser): Promise<AuthTokens> {
    const payload = { userId: user.id, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken, user };
  }
}
