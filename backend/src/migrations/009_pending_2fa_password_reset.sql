-- Migração 009: Tabelas para 2FA persistente e reset de senha
-- Execute no Supabase SQL Editor

-- Token 2FA pendente (substitui in-memory Map — escala em múltiplas instâncias)
CREATE TABLE IF NOT EXISTS pending_2fa (
  token_hash TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pending_2fa_expires ON pending_2fa(expires_at);

-- Cleanup automático de tokens expirados (trigger simples)
CREATE OR REPLACE FUNCTION cleanup_expired_2fa() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM pending_2fa WHERE expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_2fa ON pending_2fa;
CREATE TRIGGER trg_cleanup_2fa
  AFTER INSERT ON pending_2fa
  EXECUTE FUNCTION cleanup_expired_2fa();

-- Tokens de reset de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_id    ON password_reset_tokens(user_id);
