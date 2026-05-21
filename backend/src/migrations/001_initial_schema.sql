-- Novux Finance - Schema Inicial
-- Migração 001

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
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

CREATE INDEX idx_users_email ON users(email);

-- Tabela de refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  type       VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  color      VARCHAR(7),
  icon       VARCHAR(50),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- user_id NULL = categoria global (padrão do sistema)
  UNIQUE (user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Categorias padrão do sistema (user_id NULL = global)
INSERT INTO categories (name, type, is_default) VALUES
  ('Alimentação',     'expense', true),
  ('Transporte',      'expense', true),
  ('Moradia',         'expense', true),
  ('Lazer',           'expense', true),
  ('Saúde',           'expense', true),
  ('Educação',        'expense', true),
  ('Assinaturas',     'expense', true),
  ('Vestuário',       'expense', true),
  ('Outros',          'expense', true),
  ('Salário',         'income',  true),
  ('Freelance',       'income',  true),
  ('Investimentos',   'both',    true)
ON CONFLICT DO NOTHING;

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type               VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  value              NUMERIC(15, 2) NOT NULL CHECK (value > 0),
  category           VARCHAR(100) NOT NULL,
  date               DATE NOT NULL,
  description        VARCHAR(255) NOT NULL,
  notes              TEXT,
  recurrence         VARCHAR(10) NOT NULL DEFAULT 'none'
                       CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_months  INTEGER,
  is_recurring       BOOLEAN NOT NULL DEFAULT false,
  tags               TEXT[] DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id      ON transactions(user_id);
CREATE INDEX idx_transactions_date         ON transactions(date DESC);
CREATE INDEX idx_transactions_type         ON transactions(type);
CREATE INDEX idx_transactions_user_date    ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_type    ON transactions(user_id, type);

-- Tabela de metas financeiras
CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  target_value NUMERIC(15, 2) NOT NULL CHECK (target_value > 0),
  current_value NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  deadline     DATE,
  category     VARCHAR(100),
  color        VARCHAR(7),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
