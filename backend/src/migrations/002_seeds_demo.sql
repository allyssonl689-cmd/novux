-- ============================================================
-- Novux Finance - Seeds de Demonstração
-- Migração 002
--
-- ATENÇÃO: Este seed cria um usuário demo e dados de exemplo.
-- Execute APENAS em ambientes de desenvolvimento/staging.
-- Em produção, use apenas 001_initial_schema.sql.
--
-- Senha do usuário demo: Demo@1234
-- Hash bcrypt com 12 rounds gerado para "Demo@1234"
-- ============================================================

-- Usuário demo
INSERT INTO users (id, name, email, password_hash, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Usuário Demo',
  'demo@novux.app',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/o8UNi7Kf2',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Transações de demonstração (últimos 6 meses)
-- Todas vinculadas ao usuário demo
-- ============================================================

-- Variável para o user_id (para reutilizar)
DO $$
DECLARE
  uid UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
  today DATE := CURRENT_DATE;
BEGIN

-- ── MAIO 2026 ────────────────────────────────────────────────
INSERT INTO transactions (user_id, type, value, category, date, description, recurrence, tags) VALUES
  (uid, 'income',  8500.00, 'Salário',      today - 14, 'Salário maio/2026',         'monthly', '{}'),
  (uid, 'income',  1200.00, 'Freelance',    today - 10, 'Projeto site e-commerce',   'none',    '{"freelance"}'),
  (uid, 'expense', 1800.00, 'Moradia',      today - 13, 'Aluguel maio',              'monthly', '{"fixo"}'),
  (uid, 'expense',  420.00, 'Alimentação',  today -  2, 'Supermercado Zona Sul',     'none',    '{}'),
  (uid, 'expense',  180.00, 'Alimentação',  today -  5, 'iFood - semana',            'none',    '{"delivery"}'),
  (uid, 'expense',  150.00, 'Transporte',   today -  8, 'Combustível',               'none',    '{}'),
  (uid, 'expense',   49.90, 'Assinaturas',  today -  1, 'Netflix',                   'monthly', '{"streaming"}'),
  (uid, 'expense',   29.90, 'Assinaturas',  today -  1, 'Spotify',                   'monthly', '{"streaming"}'),
  (uid, 'expense',  350.00, 'Saúde',        today -  7, 'Plano de saúde',            'monthly', '{"fixo"}'),
  (uid, 'expense',  280.00, 'Educação',     today -  3, 'Curso online TypeScript',   'none',    '{"educação"}'),
  (uid, 'expense',  120.00, 'Lazer',        today -  4, 'Cinema e jantar',           'none',    '{}');

-- ── ABRIL 2026 ───────────────────────────────────────────────
INSERT INTO transactions (user_id, type, value, category, date, description, recurrence, tags) VALUES
  (uid, 'income',  8500.00, 'Salário',      today - 44, 'Salário abril/2026',        'monthly', '{}'),
  (uid, 'income',   800.00, 'Freelance',    today - 35, 'Consultoria UX',            'none',    '{"freelance"}'),
  (uid, 'expense', 1800.00, 'Moradia',      today - 43, 'Aluguel abril',             'monthly', '{"fixo"}'),
  (uid, 'expense',  390.00, 'Alimentação',  today - 40, 'Supermercado',              'none',    '{}'),
  (uid, 'expense',  210.00, 'Alimentação',  today - 32, 'Restaurantes abril',        'none',    '{"delivery"}'),
  (uid, 'expense',  150.00, 'Transporte',   today - 38, 'Combustível',               'none',    '{}'),
  (uid, 'expense',   49.90, 'Assinaturas',  today - 30, 'Netflix',                   'monthly', '{"streaming"}'),
  (uid, 'expense',   29.90, 'Assinaturas',  today - 30, 'Spotify',                   'monthly', '{"streaming"}'),
  (uid, 'expense',  350.00, 'Saúde',        today - 37, 'Plano de saúde',            'monthly', '{"fixo"}'),
  (uid, 'expense',  450.00, 'Vestuário',    today - 28, 'Roupas outlet',             'none',    '{}'),
  (uid, 'expense',  190.00, 'Lazer',        today - 25, 'Show + bar',                'none',    '{}'),
  (uid, 'income',  2000.00, 'Investimentos',today - 20, 'Dividendos FII KNRI11',     'none',    '{"investimento"}');

-- ── MARÇO 2026 ───────────────────────────────────────────────
INSERT INTO transactions (user_id, type, value, category, date, description, recurrence, tags) VALUES
  (uid, 'income',  8500.00, 'Salário',      today - 74, 'Salário março/2026',        'monthly', '{}'),
  (uid, 'income',  1500.00, 'Freelance',    today - 65, 'App mobile freelance',      'none',    '{"freelance"}'),
  (uid, 'expense', 1800.00, 'Moradia',      today - 73, 'Aluguel março',             'monthly', '{"fixo"}'),
  (uid, 'expense',  460.00, 'Alimentação',  today - 70, 'Supermercado',              'none',    '{}'),
  (uid, 'expense',  145.00, 'Alimentação',  today - 62, 'iFood março',               'none',    '{"delivery"}'),
  (uid, 'expense',  150.00, 'Transporte',   today - 68, 'Combustível',               'none',    '{}'),
  (uid, 'expense',   49.90, 'Assinaturas',  today - 60, 'Netflix',                   'monthly', '{"streaming"}'),
  (uid, 'expense',   29.90, 'Assinaturas',  today - 60, 'Spotify',                   'monthly', '{"streaming"}'),
  (uid, 'expense',  350.00, 'Saúde',        today - 67, 'Plano de saúde',            'monthly', '{"fixo"}'),
  (uid, 'expense',  320.00, 'Educação',     today - 55, 'MBA módulo 3',              'none',    '{"educação"}'),
  (uid, 'expense',   89.90, 'Lazer',        today - 50, 'Streaming anual Disney+',   'none',    '{"streaming"}');

-- ── FEVEREIRO 2026 ───────────────────────────────────────────
INSERT INTO transactions (user_id, type, value, category, date, description, recurrence, tags) VALUES
  (uid, 'income',  8500.00, 'Salário',      today - 104,'Salário fevereiro/2026',    'monthly', '{}'),
  (uid, 'expense', 1800.00, 'Moradia',      today - 103,'Aluguel fevereiro',         'monthly', '{"fixo"}'),
  (uid, 'expense',  410.00, 'Alimentação',  today -  98,'Supermercado',              'none',    '{}'),
  (uid, 'expense',  165.00, 'Alimentação',  today -  90,'Restaurantes',              'none',    '{"delivery"}'),
  (uid, 'expense',  150.00, 'Transporte',   today -  96,'Combustível',               'none',    '{}'),
  (uid, 'expense',   49.90, 'Assinaturas',  today -  88,'Netflix',                   'monthly', '{"streaming"}'),
  (uid, 'expense',   29.90, 'Assinaturas',  today -  88,'Spotify',                   'monthly', '{"streaming"}'),
  (uid, 'expense',  350.00, 'Saúde',        today -  97,'Plano de saúde',            'monthly', '{"fixo"}'),
  (uid, 'expense',  680.00, 'Lazer',        today -  82,'Viagem fim de semana SP',   'none',    '{"viagem"}'),
  (uid, 'income',   500.00, 'Outros',       today -  85,'Venda notebook usado',      'none',    '{}');

-- ── JANEIRO 2026 ─────────────────────────────────────────────
INSERT INTO transactions (user_id, type, value, category, date, description, recurrence, tags) VALUES
  (uid, 'income',  8500.00, 'Salário',      today - 134,'Salário janeiro/2026',      'monthly', '{}'),
  (uid, 'income',  2500.00, 'Freelance',    today - 120,'Projeto dashboard BI',      'none',    '{"freelance"}'),
  (uid, 'expense', 1800.00, 'Moradia',      today - 133,'Aluguel janeiro',           'monthly', '{"fixo"}'),
  (uid, 'expense',  440.00, 'Alimentação',  today - 128,'Supermercado',              'none',    '{}'),
  (uid, 'expense',  195.00, 'Alimentação',  today - 118,'Restaurantes/delivery',     'none',    '{"delivery"}'),
  (uid, 'expense',  150.00, 'Transporte',   today - 126,'Combustível',               'none',    '{}'),
  (uid, 'expense',   49.90, 'Assinaturas',  today - 115,'Netflix',                   'monthly', '{"streaming"}'),
  (uid, 'expense',   29.90, 'Assinaturas',  today - 115,'Spotify',                   'monthly', '{"streaming"}'),
  (uid, 'expense',  350.00, 'Saúde',        today - 127,'Plano de saúde',            'monthly', '{"fixo"}'),
  (uid, 'expense',  890.00, 'Educação',     today - 110,'Matrícula pós-graduação',   'none',    '{"educação"}'),
  (uid, 'expense',  380.00, 'Vestuário',    today - 105,'Verão - roupas e calçados', 'none',    '{}');

-- ── DEZEMBRO 2025 ────────────────────────────────────────────
INSERT INTO transactions (user_id, type, value, category, date, description, recurrence, tags) VALUES
  (uid, 'income', 17000.00, 'Salário',      today - 164,'Salário + 13º dezembro/2025','monthly','{"13o"}'),
  (uid, 'income',  1800.00, 'Freelance',    today - 150,'Sites para clientes',       'none',    '{"freelance"}'),
  (uid, 'expense', 1800.00, 'Moradia',      today - 163,'Aluguel dezembro',          'monthly', '{"fixo"}'),
  (uid, 'expense',  680.00, 'Alimentação',  today - 158,'Supermercado + ceia natal',  'none',    '{}'),
  (uid, 'expense',  320.00, 'Alimentação',  today - 145,'Confraternização empresa',  'none',    '{}'),
  (uid, 'expense',  150.00, 'Transporte',   today - 156,'Combustível',               'none',    '{}'),
  (uid, 'expense',   49.90, 'Assinaturas',  today - 145,'Netflix',                   'monthly', '{"streaming"}'),
  (uid, 'expense',   29.90, 'Assinaturas',  today - 145,'Spotify',                   'monthly', '{"streaming"}'),
  (uid, 'expense',  350.00, 'Saúde',        today - 157,'Plano de saúde',            'monthly', '{"fixo"}'),
  (uid, 'expense', 1200.00, 'Lazer',        today - 140,'Presentes de natal',        'none',    '{"natal"}'),
  (uid, 'expense',  850.00, 'Lazer',        today - 135,'Viagem réveillon',          'none',    '{"viagem"}'),
  (uid, 'income',  3000.00, 'Investimentos',today - 148,'Resgate CDB vencimento',    'none',    '{"investimento"}');

END $$;

-- ============================================================
-- Metas financeiras de demonstração
-- ============================================================
INSERT INTO goals (user_id, title, description, target_value, current_value, deadline, category, color)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Fundo de Emergência',
    '6 meses de despesas cobertas',
    15000.00, 8500.00,
    CURRENT_DATE + INTERVAL '7 months',
    'Emergência', 'hsl(161,100%,45%)'
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Viagem para Europa',
    'Lisboa, Madri e Paris — 15 dias',
    20000.00, 4200.00,
    CURRENT_DATE + INTERVAL '13 months',
    'Viagem', 'hsl(245,100%,72%)'
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Notebook Novo',
    'MacBook Pro M4',
    6000.00, 5400.00,
    CURRENT_DATE + INTERVAL '2 months',
    'Tecnologia', 'hsl(43,95%,58%)'
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Reserva de Investimento',
    'Capital inicial para carteira de ações',
    50000.00, 12000.00,
    CURRENT_DATE + INTERVAL '20 months',
    'Investimento', 'hsl(193,100%,50%)'
  )
ON CONFLICT DO NOTHING;
