import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES   = 12; // 96 bits — tamanho recomendado para GCM
const TAG_BYTES  = 16;

function keyBuffer(): Buffer {
  const hex = env.ENCRYPTION_KEY;
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY deve ter exatamente 64 caracteres hex (32 bytes)');
  return Buffer.from(hex, 'hex');
}

/**
 * Cifra um texto com AES-256-GCM.
 * Formato de saída (base64): IV(12) + AuthTag(16) + Ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = keyBuffer();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decifra um valor produzido por `encrypt`.
 * Retorna null se o valor for nulo/indefinido (campo opcional no banco).
 */
export function decrypt(ciphertext: string): string;
export function decrypt(ciphertext: string | null | undefined): string | null;
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null) return null;

  const key = keyBuffer();
  const buf = Buffer.from(ciphertext, 'base64');

  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('Ciphertext inválido — comprimento insuficiente');
  }

  const iv        = buf.subarray(0, IV_BYTES);
  const tag       = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = buf.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

/**
 * HMAC-SHA256 determinístico para buscas por e-mail sem expor o valor.
 * Normaliza para lowercase antes de calcular.
 */
export function emailHmac(email: string): string {
  return createHmac('sha256', env.ENCRYPTION_KEY)
    .update(email.toLowerCase().trim())
    .digest('hex');
}
