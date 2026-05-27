-- ============================================================
-- NOVUX FINANCE - Script completo de criação do banco
-- Cole este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- 001: Schema inicial
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(500),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);

CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  type       VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  color      VARCHAR(7),
  icon       VARCHAR(50),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

INSERT INTO categories (name, type, is_default) VALUES
  ('Alimentação',   'expense', true),
  ('Transporte',    'expense', true),
  ('Moradia',       'expense', true),
  ('Lazer',         'expense', true),
  ('Saúde',         'expense', true),
  ('Educação',      'expense', true),
  ('Assinaturas',   'expense', true),
  ('Vestuário',     'expense', true),
  ('Outros',        'expense', true),
  ('Salário',       'income',  true),
  ('Freelance',     'income',  true),
  ('Investimentos', 'both',    true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  value             NUMERIC(15, 2) NOT NULL CHECK (value > 0),
  category          VARCHAR(100) NOT NULL,
  date              DATE NOT NULL,
  description       VARCHAR(255) NOT NULL,
  notes             TEXT,
  recurrence        VARCHAR(10) NOT NULL DEFAULT 'none'
                      CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_months INTEGER,
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  tags              TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);

CREATE TABLE IF NOT EXISTS goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  target_value  NUMERIC(15, 2) NOT NULL CHECK (target_value > 0),
  current_value NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  deadline      DATE,
  category      VARCHAR(100),
  color         VARCHAR(7),
  is_completed  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS goals_updated_at ON goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 003: Coluna paid
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

-- 004: Attachment e currency
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

-- 005: Histórico de edições
CREATE TABLE IF NOT EXISTS transaction_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action         VARCHAR(10) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  snapshot       JSONB NOT NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_history_transaction_id ON transaction_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_history_user_id        ON transaction_history(user_id);

-- 006: 2FA TOTP
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
