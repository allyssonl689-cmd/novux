import { randomBytes, createHash } from 'crypto';
import { db, Queryable } from '../config/database';

const RECOVERY_CODE_COUNT = 10;
// Alfabeto base32 sem caracteres ambíguos (sem 0/O/1/I) para leitura/digitação.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Normaliza para hash determinístico: remove separadores e caixa. */
function normalize(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function hashCode(code: string): string {
  return createHash('sha256').update(normalize(code)).digest('hex');
}

/** Gera um código legível no formato XXXXX-XXXXX (10 chars + separador). */
function generateCode(): string {
  const bytes = randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/**
 * (Re)gera os códigos de recuperação do usuário: descarta os antigos e cria N novos.
 * Retorna os códigos em TEXTO PURO — exibir ao usuário UMA única vez (só o hash fica salvo).
 */
export async function generateRecoveryCodes(userId: string, executor: Queryable = db): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateCode);
  await executor.query('DELETE FROM two_factor_recovery_codes WHERE user_id = $1', [userId]);
  for (const code of codes) {
    await executor.query(
      'INSERT INTO two_factor_recovery_codes (user_id, code_hash) VALUES ($1, $2)',
      [userId, hashCode(code)],
    );
  }
  return codes;
}

/**
 * Tenta consumir um código de recuperação (uso único). Retorna true se era válido
 * e ainda não usado — marcando-o como usado de forma atômica.
 */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE two_factor_recovery_codes SET used_at = NOW()
     WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL`,
    [userId, hashCode(code)],
  );
  return (rowCount ?? 0) > 0;
}
