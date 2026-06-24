import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { verifySync } from 'otplib';
import { sendPasswordResetEmail, sendWelcomeEmail, sendEmailVerificationEmail } from './emailService';
import { db, withTransaction } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/auth';
import { UserModel } from '../models/UserModel';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '../validators/authValidators';
import { PublicUser } from '../models/types';
import { recordLoginAttempt } from '../middleware/bruteForce';
import { audit } from './auditService';
import { decrypt, emailHmac } from '../utils/encryption';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

type LoginResult = AuthTokens | { requires2FA: true; tempToken: string };

export class AuthService {
  static async register(input: RegisterInput, ip?: string): Promise<AuthTokens> {
    const exists = await UserModel.emailExists(input.email);
    if (exists) throw new AppError('Email já cadastrado', 409);

    const password_hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    // Gera token de verificação de e-mail
    const verifyToken = randomBytes(32).toString('base64url');
    const verifyHash  = hashToken(verifyToken);
    const verifyExp   = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Cria o usuário e o token de verificação atomicamente: sem isso, uma falha
    // no INSERT do token deixaria um usuário sem como verificar o e-mail.
    const user = await withTransaction(async client => {
      const created = await UserModel.create(
        { name: input.name, email: input.email, password_hash },
        client
      );
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [created.id, verifyHash, verifyExp]
      );
      return created;
    });

    // Não grava PII (nome) em claro no audit log — o user.id já identifica.
    await audit(user.id, 'register', 'account', ip);

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

    // Dispara e-mails em background — não bloqueia o registro
    // Falhas são logadas com contexto suficiente para debug em produção
    Promise.all([
      sendWelcomeEmail(user.email, user.name).catch(e => {
        console.error('[Email] Falha ao enviar boas-vindas para', user.email, '—', (e as Error).message);
      }),
      sendEmailVerificationEmail(user.email, user.name, verifyUrl).catch(e => {
        // Nunca logar a URL/token de verificação (concede controle da conta) — só o id
        console.error('[Email] Falha ao enviar verificação para o usuário', user.id, '—', (e as Error).message);
      }),
    ]);

    return this.issueTokens(user);
  }

  static async login(input: LoginInput, ip?: string): Promise<LoginResult> {
    const user = await UserModel.findByEmail(input.email);
    if (!user) {
      await recordLoginAttempt(input.email, ip ?? 'unknown', false);
      // E-mail nunca em claro no audit — grava só o HMAC (correlação sem expor PII).
      await audit(null, 'login_failed', 'account', ip, { emailHash: emailHmac(input.email) });
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
      const tokenHash = hashToken(tempToken);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Armazena no banco (persistente, escala em múltiplas instâncias)
      await db.query(
        `INSERT INTO pending_2fa (token_hash, user_id, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (token_hash) DO NOTHING`,
        [tokenHash, user.id, expiresAt]
      );

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
    const tokenHash = hashToken(tempToken);
    const MAX_2FA_ATTEMPTS = 5;

    const { rows: pendingRows } = await db.query<{ user_id: string; attempts: number }>(
      'SELECT user_id, attempts FROM pending_2fa WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    const entry = pendingRows[0];
    if (!entry) throw new AppError('Sessão expirada. Faça login novamente.', 401);

    // Lockout: estoura o limite de tentativas de código por sessão (anti brute force)
    if (entry.attempts >= MAX_2FA_ATTEMPTS) {
      await db.query('DELETE FROM pending_2fa WHERE token_hash = $1', [tokenHash]);
      throw new AppError('Muitas tentativas inválidas. Faça login novamente.', 429);
    }

    const { rows } = await db.query<{
      id: string; name: string; email: string; avatar_url: string | null;
      is_active: boolean; created_at: Date; updated_at: Date; totp_secret: string | null;
    }>(
      'SELECT id, name, email, avatar_url, is_active, created_at, updated_at, totp_secret FROM users WHERE id = $1',
      [entry.user_id]
    );
    const user = rows[0];
    if (!user || !user.totp_secret) throw new AppError('Usuário não encontrado', 404);

    const totpSecret = decrypt(user.totp_secret)!;
    const result = verifySync({ token: totpToken, secret: totpSecret });
    if (!result?.valid) {
      // Incrementa a contagem; ao atingir o teto, invalida a sessão de 2FA
      const upd = await db.query<{ attempts: number }>(
        'UPDATE pending_2fa SET attempts = attempts + 1 WHERE token_hash = $1 RETURNING attempts',
        [tokenHash]
      );
      if ((upd.rows[0]?.attempts ?? MAX_2FA_ATTEMPTS) >= MAX_2FA_ATTEMPTS) {
        await db.query('DELETE FROM pending_2fa WHERE token_hash = $1', [tokenHash]);
        throw new AppError('Muitas tentativas inválidas. Faça login novamente.', 429);
      }
      throw new AppError('Código 2FA inválido', 400);
    }

    // Sucesso: consome o token (previne replay) antes de emitir as credenciais
    await db.query('DELETE FROM pending_2fa WHERE token_hash = $1', [tokenHash]);

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

  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    // Rotação: cada refresh token vale UMA vez. Removemos o atual de forma atômica;
    // se ele não existia (já rotacionado/expirado), pode ser reuso de um token
    // roubado → revogamos TODAS as sessões do usuário por segurança.
    const del = await db.query(
      `DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id`,
      [tokenHash]
    );
    if ((del.rowCount ?? 0) === 0) {
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [payload.userId]);
      throw new AppError('Sessão inválida. Faça login novamente.', 401);
    }

    // Emite um novo par (access + refresh) e grava só o hash do novo refresh.
    const newPayload   = { userId: payload.userId, email: payload.email };
    const accessToken  = signAccessToken(newPayload);
    const newRefresh   = signRefreshToken(newPayload);
    const newHash      = hashToken(newRefresh);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [payload.userId, newHash, expiresAt]
    );

    return { accessToken, refreshToken: newRefresh };
  }

  static async logout(refreshToken: string, userId?: string, ip?: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    if (userId) await audit(userId, 'logout', 'account', ip);
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string, ip?: string): Promise<void> {
    const { rows } = await db.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    const user = rows[0];
    if (!user) throw new AppError('Usuário não encontrado', 404);

    // Rejeita troca de senha em contas OAuth (sem senha local)
    if (user.password_hash === 'google-oauth') {
      throw new AppError('Conta Google não possui senha local para alterar', 400);
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Senha atual incorreta', 401);

    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    // Troca de senha + invalidação dos refresh tokens de forma atômica: evita
    // estado inconsistente onde a senha muda mas sessões antigas seguem válidas.
    await withTransaction(async client => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      );
      // Invalida todos os refresh tokens (força re-login nos outros dispositivos)
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    });

    await audit(userId, 'password_change', 'account', ip);
  }

  static async forgotPassword(email: string, ip?: string): Promise<void> {
    const user = await UserModel.findByEmail(email);
    // Resposta idêntica independente de o e-mail existir (evita user enumeration)
    if (!user) return;
    if (user.password_hash === 'google-oauth') return;

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalida tokens anteriores e cria o novo atomicamente: nunca deixa o usuário
    // sem nenhum token de reset válido por falha entre o DELETE e o INSERT.
    await withTransaction(async client => {
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    // Envia e-mail com timeout de 8s — evita que SMTP bloqueado trave o request
    // A resposta é sempre 200 independente do resultado (segurança: não vaza info)
    try {
      await Promise.race([
        sendPasswordResetEmail(user.email, user.name, resetUrl),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout')), 8_000)
        ),
      ]);
    } catch (emailErr) {
      // Nunca logar a URL/token de reset (concede controle da conta) — só o id do usuário
      console.error('[forgotPassword] Falha ao enviar e-mail de reset para o usuário', user.id, '—', (emailErr as Error).message);
    }

    await audit(user.id, 'password_reset_requested', 'account', ip);
  }

  static async resetPassword(token: string, newPassword: string, ip?: string): Promise<void> {
    const tokenHash = hashToken(token);

    const { rows } = await db.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW() AND used = false`,
      [tokenHash]
    );
    const entry = rows[0];
    if (!entry) throw new AppError('Link inválido ou expirado. Solicite um novo.', 400);

    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    // Marca o token como usado, troca a senha e invalida as sessões atomicamente:
    // qualquer falha no meio deixaria token consumido sem senha trocada (ou vice-versa).
    await withTransaction(async client => {
      // Marca como usado antes de alterar a senha (evita replay em caso de erro)
      await client.query(
        'UPDATE password_reset_tokens SET used = true WHERE id = $1',
        [entry.id]
      );
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, entry.user_id]
      );
      // Invalida todos os refresh tokens (segurança: força re-login)
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [entry.user_id]);
    });

    await audit(entry.user_id, 'password_reset', 'account', ip);
  }

  static async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const { rows } = await db.query<{ user_id: string }>(
      `SELECT user_id FROM email_verification_tokens
       WHERE token_hash = $1 AND expires_at > NOW() AND used = false`,
      [tokenHash]
    );
    if (!rows[0]) throw new AppError('Link inválido ou expirado. Solicite um novo.', 400);
    await db.query('UPDATE email_verification_tokens SET used = true WHERE token_hash = $1', [tokenHash]);
    await UserModel.verifyEmail(rows[0].user_id);
  }

  static async resendVerification(userId: string, email: string, name?: string): Promise<void> {
    await db.query('UPDATE email_verification_tokens SET used = true WHERE user_id = $1', [userId]);
    const token    = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmailVerificationEmail(email, name, verifyUrl);
  }

  static async deleteAccount(userId: string, ip?: string): Promise<void> {
    await audit(userId, 'delete_account', 'account', ip);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  private static async issueTokens(user: PublicUser): Promise<AuthTokens> {
    const payload = { userId: user.id, email: user.email };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persiste APENAS o hash SHA-256 do refresh token — nunca o valor em texto puro.
    // Um dump do banco não expõe mais credenciais de sessão reutilizáveis.
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    return { accessToken, refreshToken, user };
  }
}
