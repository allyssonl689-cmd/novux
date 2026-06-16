-- ============================================================
--  Novux Finance — Migration completa
--  Compatível com PostgreSQL 14+
--
--  Como rodar no DBeaver:
--    1. Abra uma conexão com o banco novux_finance
--    2. Abra este arquivo (File > Open File)
--    3. Selecione tudo (Ctrl+A) e execute (Ctrl+Enter ou F5)
--
--  Para criar o banco antes de rodar:
--    CREATE DATABASE novux_finance
--      ENCODING 'UTF8'
--      LC_COLLATE 'pt_BR.UTF-8'  -- ou 'en_US.UTF-8' se não tiver pt_BR
--      LC_CTYPE   'pt_BR.UTF-8'
--      TEMPLATE template0;
-- ============================================================


-- ============================================================
--  000 — Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() (fallback)


-- ============================================================
--  001 — Controle de migrations
-- ============================================================
CREATE TABLE IF NOT EXISTS _migrations (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
--  002 — Função updated_at (compartilhada por todas as tabelas)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  003 — Usuários
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  plan          VARCHAR(20)  NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'pro', 'business')),
  avatar_url    TEXT,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


-- ============================================================
--  004 — Refresh tokens (controle de sessão JWT)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);

-- Limpeza automática de tokens expirados (recomenda-se rodar via pg_cron em produção)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW();


-- ============================================================
--  005 — Categorias
--  user_id NULL = categoria global (padrão do sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(80) NOT NULL,
  type       VARCHAR(10) NOT NULL DEFAULT 'both'
               CHECK (type IN ('income', 'expense', 'both')),
  icon       VARCHAR(10) NOT NULL DEFAULT '📦',
  color      VARCHAR(40) NOT NULL DEFAULT 'hsl(199 89% 55%)',
  is_default BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name
  ON categories(user_id, name)
  WHERE user_id IS NOT NULL;

-- Categorias padrão do sistema (user_id NULL = globais)
INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Alimentação',     'expense', '🍔', 'hsl(16  100% 60%)',  true),
  ('Transporte',      'expense', '🚗', 'hsl(199  89% 55%)',  true),
  ('Moradia',         'expense', '🏠', 'hsl(262  80% 65%)',  true),
  ('Lazer',           'expense', '🎮', 'hsl(280  70% 65%)',  true),
  ('Saúde',           'expense', '❤️', 'hsl(348  90% 62%)',  true),
  ('Educação',        'expense', '📚', 'hsl(43   95% 58%)',  true),
  ('Assinaturas',     'expense', '📱', 'hsl(220  60% 60%)',  true),
  ('Vestuário',       'expense', '👕', 'hsl(300  60% 65%)',  true),
  ('Outros',          'expense', '📦', 'hsl(220  12% 55%)',  true),
  ('Salário',         'income',  '💼', 'hsl(161 100% 45%)',  true),
  ('Freelance',       'income',  '💻', 'hsl(193 100% 50%)',  true),
  ('Investimentos',   'both',    '📈', 'hsl(43   95% 58%)',  true)
ON CONFLICT DO NOTHING;


-- ============================================================
--  006 — Transações
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(10)   NOT NULL CHECK (type IN ('income', 'expense')),
  value             NUMERIC(15,2) NOT NULL CHECK (value > 0),
  category          VARCHAR(80)   NOT NULL,
  description       VARCHAR(255)  NOT NULL,
  date              DATE          NOT NULL,
  notes             TEXT,
  recurrence        VARCHAR(10)   NOT NULL DEFAULT 'none'
                      CHECK (recurrence IN ('none','daily','weekly','monthly','yearly')),
  recurrence_months INTEGER,
  is_recurring      BOOLEAN       NOT NULL DEFAULT false,
  tags              TEXT[]        NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transactions_updated_at'
  ) THEN
    CREATE TRIGGER trg_transactions_updated_at
      BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


-- ============================================================
--  007 — Metas financeiras
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  target_value  NUMERIC(15,2) NOT NULL CHECK (target_value > 0),
  current_value NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  deadline      DATE,
  category      VARCHAR(80),
  icon          VARCHAR(10)   DEFAULT '🎯',
  color         VARCHAR(40)   DEFAULT 'hsl(199 89% 55%)',
  is_completed  BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goals_updated_at'
  ) THEN
    CREATE TRIGGER trg_goals_updated_at
      BEFORE UPDATE ON goals
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


-- ============================================================
--  008 — Orçamentos por categoria (budgets)
--  Permite definir teto de gasto mensal/anual por categoria
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   VARCHAR(80)   NOT NULL,
  amount     NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  period     VARCHAR(10)   NOT NULL DEFAULT 'monthly'
               CHECK (period IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, period)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_budgets_updated_at'
  ) THEN
    CREATE TRIGGER trg_budgets_updated_at
      BEFORE UPDATE ON budgets
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


-- ============================================================
--  009 — Histórico de chat com IA
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  tokens     INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id, created_at DESC);


-- ============================================================
--  Registra migrations aplicadas
-- ============================================================
INSERT INTO _migrations (name) VALUES
  ('000_extensions'),
  ('001_migrations_table'),
  ('002_set_updated_at_function'),
  ('003_users'),
  ('004_refresh_tokens'),
  ('005_categories'),
  ('006_transactions'),
  ('007_goals'),
  ('008_budgets'),
  ('009_ai_chats')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
DO $$ BEGIN
  RAISE NOTICE '✅  Novux Finance — migration concluída com sucesso!';
  RAISE NOTICE '    Tabelas: users, refresh_tokens, categories, transactions, goals, budgets, ai_chats, _migrations';
END $$;
