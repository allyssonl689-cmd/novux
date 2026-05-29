-- Migration 009: tabela para pending_2fa (substitui Map em memória)
-- Executar: psql $DATABASE_URL -f 009_pending_2fa.sql

CREATE TABLE IF NOT EXISTS pending_2fa (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT        NOT NULL UNIQUE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_2fa_expires_idx ON pending_2fa(expires_at);

-- Limpar registros expirados automaticamente (opcional: configurar pg_cron)
-- DELETE FROM pending_2fa WHERE expires_at < NOW();
