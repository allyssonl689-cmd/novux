/**
 * Script de migração de dados — executa UMA VEZ após a migration 012_encrypt_pii.sql.
 *
 * Criptografa registros existentes em texto puro:
 *   - users.name, users.email  → AES-256-GCM  +  email_hash = HMAC-SHA256
 *   - transactions.description, transactions.notes → AES-256-GCM
 *
 * Pré-requisitos:
 *   1. Executar migration 012_encrypt_pii.sql no banco
 *   2. Definir ENCRYPTION_KEY no .env (64 chars hex)
 *
 * Execução:
 *   npx ts-node src/migrations/scripts/encrypt_existing_data.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { createCipheriv, createHmac, randomBytes } from 'crypto';

/* ── Crypto inline (sem importar src/utils para evitar dependência circular no bootstrap) ── */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES   = 12;
const TAG_BYTES  = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? '';
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY inválida — precisa de 64 caracteres hex');
  return Buffer.from(hex, 'hex');
}

function encryptValue(plaintext: string): string {
  const key      = getKey();
  const iv       = randomBytes(IV_BYTES);
  const cipher   = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag      = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function hmacValue(email: string): string {
  return createHmac('sha256', process.env.ENCRYPTION_KEY!)
    .update(email.toLowerCase().trim())
    .digest('hex');
}

function looksEncrypted(value: string): boolean {
  // Valores cifrados são base64 e têm comprimento mínimo de (12+16+1 bytes → 40 chars base64)
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length >= IV_BYTES + TAG_BYTES + 1 && /^[A-Za-z0-9+/]+=*$/.test(value);
  } catch {
    return false;
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔐 Iniciando migração de criptografia...\n');

    /* ── Usuários ── */
    const { rows: users } = await pool.query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM users`
    );

    console.log(`👤 Usuários encontrados: ${users.length}`);
    let usersMigrated = 0;

    for (const user of users) {
      if (looksEncrypted(user.email)) continue; // já migrado

      const encEmail = encryptValue(user.email.toLowerCase());
      const encName  = encryptValue(user.name);
      const hash     = hmacValue(user.email);

      await pool.query(
        `UPDATE users SET email = $1, name = $2, email_hash = $3 WHERE id = $4`,
        [encEmail, encName, hash, user.id]
      );
      usersMigrated++;
    }

    console.log(`  ✅ ${usersMigrated} usuário(s) criptografados (${users.length - usersMigrated} já estavam)\n`);

    /* ── Transações ── */
    const { rows: txs } = await pool.query<{ id: string; description: string; notes: string | null }>(
      `SELECT id, description, notes FROM transactions`
    );

    console.log(`💸 Transações encontradas: ${txs.length}`);
    let txsMigrated = 0;

    const BATCH = 500;
    for (let i = 0; i < txs.length; i += BATCH) {
      const batch = txs.slice(i, i + BATCH);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const tx of batch) {
          if (looksEncrypted(tx.description)) continue;

          const encDesc  = encryptValue(tx.description);
          const encNotes = tx.notes ? encryptValue(tx.notes) : null;

          await client.query(
            `UPDATE transactions SET description = $1, notes = $2 WHERE id = $3`,
            [encDesc, encNotes, tx.id]
          );
          txsMigrated++;
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const pct = Math.round(((i + batch.length) / txs.length) * 100);
      process.stdout.write(`\r  Progresso: ${pct}%`);
    }

    console.log(`\n  ✅ ${txsMigrated} transação(ões) criptografadas (${txs.length - txsMigrated} já estavam)\n`);

    /* ── Finalizar constraints ── */
    console.log('🔧 Aplicando constraints pós-migração...');
    await pool.query(`ALTER TABLE users ALTER COLUMN email_hash SET NOT NULL`);
    await pool.query(`DROP INDEX IF EXISTS idx_users_email`);
    console.log('  ✅ email_hash NOT NULL + índice antigo removido\n');

    console.log('🎉 Migração de criptografia concluída com sucesso!');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Erro na migração:', err);
  process.exit(1);
});
