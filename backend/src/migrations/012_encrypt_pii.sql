-- Migração 012 — Criptografia de PII
-- Adiciona email_hash (HMAC-SHA256) para buscas sem expor o e-mail em texto puro.
-- As colunas name, email, description e notes passam a armazenar valores cifrados com AES-256-GCM.
-- O script de migração de dados (encrypt_existing_data.ts) deve ser executado APÓS esta migration.

-- 1. Adiciona email_hash e amplia varchar para comportar texto base64 cifrado
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- Email cifrado é ~100-150 bytes em base64; name cifrado idem
ALTER TABLE users
  ALTER COLUMN email TYPE TEXT,
  ALTER COLUMN name  TYPE TEXT;

-- 2. Índice único para buscas por email_hash (substitui idx_users_email após migração dos dados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

-- 3. Transactions: description e notes armazenam texto cifrado (base64)
ALTER TABLE transactions
  ALTER COLUMN description TYPE TEXT,
  ALTER COLUMN notes       TYPE TEXT;

-- 4. Após executar encrypt_existing_data.ts, adicionar NOT NULL e dropar índice antigo:
-- ALTER TABLE users ALTER COLUMN email_hash SET NOT NULL;
-- DROP INDEX IF EXISTS idx_users_email;   -- substituído por idx_users_email_hash
