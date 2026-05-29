-- ══════════════════════════════════════════════════════════
-- Migração 008: Segurança + Compliance LGPD
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- ── Brute force protection ──
CREATE TABLE IF NOT EXISTS login_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  ip_address TEXT,
  success    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts(ip_address, created_at);

-- ── Audit log (LGPD art. 37) ──
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,   -- login, logout, export, delete_account, view_data
  resource   TEXT,            -- transactions, goals, account
  ip_address TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user    ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON audit_log(action, created_at);

-- ── Colunas extras em users ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin            BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_consent_at     TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code       TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan                TEXT DEFAULT 'free';

-- Gerar código de referência para usuários existentes
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- ── Hash do refresh token (segurança) ──
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
-- Após adicionar, atualize os tokens existentes (opcional — tokens existentes continuam por token)
