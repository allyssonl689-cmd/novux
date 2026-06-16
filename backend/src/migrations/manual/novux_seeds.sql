-- ============================================================
--  Novux Finance — Seeds de demonstração
--  Rodar APÓS novux_migration.sql
--
--  ⚠️  Use apenas em desenvolvimento / staging.
--
--  Usuário criado:
--    Email : demo@novux.app
--    Senha : Demo@1234
--
--  Como rodar no DBeaver:
--    Abra este arquivo na conexão novux_finance e execute (F5)
-- ============================================================


-- ============================================================
--  Usuário demo
--  Senha "Demo@1234" — hash bcrypt 12 rounds
-- ============================================================
INSERT INTO users (id, name, email, password_hash, plan, is_active)
VALUES (
  'a1b2c3d4-e5f6-0000-0000-000000000001',
  'Usuário Demo',
  'demo@novux.app',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/o8UNi7Kf2',
  'pro',
  true
)
ON CONFLICT (email) DO NOTHING;


-- ============================================================
--  Transações dos últimos 6 meses
-- ============================================================
DO $$
DECLARE
  uid  UUID := 'a1b2c3d4-e5f6-0000-0000-000000000001';
  hoje DATE := CURRENT_DATE;
BEGIN

-- ── Mês atual ────────────────────────────────────────────────
INSERT INTO transactions
  (user_id, type, value, category, description, date, recurrence, is_recurring, tags)
VALUES
  (uid,'income', 8500.00,'Salário',     'Salário mês atual',          hoje-14,'monthly',true, '{}'),
  (uid,'income', 1200.00,'Freelance',   'Projeto e-commerce',         hoje-10,'none',   false,'{"freelance"}'),
  (uid,'expense',1800.00,'Moradia',     'Aluguel',                    hoje-13,'monthly',true, '{"fixo"}'),
  (uid,'expense', 420.00,'Alimentação', 'Supermercado',               hoje- 3,'none',   false,'{}'),
  (uid,'expense', 185.00,'Alimentação', 'iFood / delivery',           hoje- 6,'none',   false,'{"delivery"}'),
  (uid,'expense', 150.00,'Transporte',  'Combustível',                hoje- 8,'none',   false,'{}'),
  (uid,'expense',  49.90,'Assinaturas', 'Netflix',                    hoje- 1,'monthly',true, '{"streaming"}'),
  (uid,'expense',  29.90,'Assinaturas', 'Spotify',                    hoje- 1,'monthly',true, '{"streaming"}'),
  (uid,'expense', 350.00,'Saúde',       'Plano de saúde',             hoje- 7,'monthly',true, '{"fixo"}'),
  (uid,'expense', 280.00,'Educação',    'Curso TypeScript avançado',  hoje- 4,'none',   false,'{"educação"}'),
  (uid,'expense', 120.00,'Lazer',       'Cinema e jantar',            hoje- 5,'none',   false,'{}');

-- ── Mês -1 ───────────────────────────────────────────────────
INSERT INTO transactions
  (user_id, type, value, category, description, date, recurrence, is_recurring, tags)
VALUES
  (uid,'income', 8500.00,'Salário',      'Salário',                   hoje-44,'monthly',true, '{}'),
  (uid,'income',  800.00,'Freelance',    'Consultoria UX',            hoje-35,'none',   false,'{"freelance"}'),
  (uid,'income', 2000.00,'Investimentos','Dividendos FII KNRI11',     hoje-28,'none',   false,'{"investimento"}'),
  (uid,'expense',1800.00,'Moradia',      'Aluguel',                   hoje-43,'monthly',true, '{"fixo"}'),
  (uid,'expense', 390.00,'Alimentação',  'Supermercado',              hoje-40,'none',   false,'{}'),
  (uid,'expense', 210.00,'Alimentação',  'Restaurantes',              hoje-32,'none',   false,'{"delivery"}'),
  (uid,'expense', 150.00,'Transporte',   'Combustível',               hoje-38,'none',   false,'{}'),
  (uid,'expense',  49.90,'Assinaturas',  'Netflix',                   hoje-30,'monthly',true, '{"streaming"}'),
  (uid,'expense',  29.90,'Assinaturas',  'Spotify',                   hoje-30,'monthly',true, '{"streaming"}'),
  (uid,'expense', 350.00,'Saúde',        'Plano de saúde',            hoje-37,'monthly',true, '{"fixo"}'),
  (uid,'expense', 450.00,'Vestuário',    'Roupas outlet',             hoje-28,'none',   false,'{}'),
  (uid,'expense', 190.00,'Lazer',        'Show + bar',                hoje-25,'none',   false,'{}');

-- ── Mês -2 ───────────────────────────────────────────────────
INSERT INTO transactions
  (user_id, type, value, category, description, date, recurrence, is_recurring, tags)
VALUES
  (uid,'income', 8500.00,'Salário',     'Salário',                    hoje-74,'monthly',true, '{}'),
  (uid,'income', 1500.00,'Freelance',   'App mobile freelance',       hoje-65,'none',   false,'{"freelance"}'),
  (uid,'expense',1800.00,'Moradia',     'Aluguel',                    hoje-73,'monthly',true, '{"fixo"}'),
  (uid,'expense', 460.00,'Alimentação', 'Supermercado',               hoje-70,'none',   false,'{}'),
  (uid,'expense', 145.00,'Alimentação', 'iFood',                      hoje-62,'none',   false,'{"delivery"}'),
  (uid,'expense', 150.00,'Transporte',  'Combustível',                hoje-68,'none',   false,'{}'),
  (uid,'expense',  49.90,'Assinaturas', 'Netflix',                    hoje-60,'monthly',true, '{"streaming"}'),
  (uid,'expense',  29.90,'Assinaturas', 'Spotify',                    hoje-60,'monthly',true, '{"streaming"}'),
  (uid,'expense', 350.00,'Saúde',       'Plano de saúde',             hoje-67,'monthly',true, '{"fixo"}'),
  (uid,'expense', 320.00,'Educação',    'MBA módulo 3',               hoje-55,'none',   false,'{"educação"}'),
  (uid,'expense',  89.90,'Lazer',       'Disney+ anual',              hoje-50,'none',   false,'{"streaming"}');

-- ── Mês -3 ───────────────────────────────────────────────────
INSERT INTO transactions
  (user_id, type, value, category, description, date, recurrence, is_recurring, tags)
VALUES
  (uid,'income', 8500.00,'Salário',     'Salário',                    hoje-104,'monthly',true,'{}'),
  (uid,'income',  500.00,'Outros',      'Venda notebook usado',       hoje- 85,'none',  false,'{}'),
  (uid,'expense',1800.00,'Moradia',     'Aluguel',                    hoje-103,'monthly',true,'{"fixo"}'),
  (uid,'expense', 410.00,'Alimentação', 'Supermercado',               hoje- 98,'none',  false,'{}'),
  (uid,'expense', 165.00,'Alimentação', 'Restaurantes',               hoje- 90,'none',  false,'{"delivery"}'),
  (uid,'expense', 150.00,'Transporte',  'Combustível',                hoje- 96,'none',  false,'{}'),
  (uid,'expense',  49.90,'Assinaturas', 'Netflix',                    hoje- 88,'monthly',true,'{"streaming"}'),
  (uid,'expense',  29.90,'Assinaturas', 'Spotify',                    hoje- 88,'monthly',true,'{"streaming"}'),
  (uid,'expense', 350.00,'Saúde',       'Plano de saúde',             hoje- 97,'monthly',true,'{"fixo"}'),
  (uid,'expense', 680.00,'Lazer',       'Viagem fim de semana',       hoje- 82,'none',  false,'{"viagem"}');

-- ── Mês -4 ───────────────────────────────────────────────────
INSERT INTO transactions
  (user_id, type, value, category, description, date, recurrence, is_recurring, tags)
VALUES
  (uid,'income', 8500.00,'Salário',     'Salário',                    hoje-134,'monthly',true,'{}'),
  (uid,'income', 2500.00,'Freelance',   'Projeto dashboard BI',       hoje-120,'none',  false,'{"freelance"}'),
  (uid,'expense',1800.00,'Moradia',     'Aluguel',                    hoje-133,'monthly',true,'{"fixo"}'),
  (uid,'expense', 440.00,'Alimentação', 'Supermercado',               hoje-128,'none',  false,'{}'),
  (uid,'expense', 195.00,'Alimentação', 'Delivery',                   hoje-118,'none',  false,'{"delivery"}'),
  (uid,'expense', 150.00,'Transporte',  'Combustível',                hoje-126,'none',  false,'{}'),
  (uid,'expense',  49.90,'Assinaturas', 'Netflix',                    hoje-115,'monthly',true,'{"streaming"}'),
  (uid,'expense',  29.90,'Assinaturas', 'Spotify',                    hoje-115,'monthly',true,'{"streaming"}'),
  (uid,'expense', 350.00,'Saúde',       'Plano de saúde',             hoje-127,'monthly',true,'{"fixo"}'),
  (uid,'expense', 890.00,'Educação',    'Matrícula pós-graduação',    hoje-110,'none',  false,'{"educação"}'),
  (uid,'expense', 380.00,'Vestuário',   'Compras de verão',           hoje-105,'none',  false,'{}');

-- ── Mês -5 (bônus: mês "gordo" com 13º) ─────────────────────
INSERT INTO transactions
  (user_id, type, value, category, description, date, recurrence, is_recurring, tags)
VALUES
  (uid,'income',17000.00,'Salário',     'Salário + 13º',              hoje-164,'monthly',false,'{"13o"}'),
  (uid,'income', 1800.00,'Freelance',   'Sites para clientes',        hoje-150,'none',   false,'{"freelance"}'),
  (uid,'income', 3000.00,'Investimentos','Resgate CDB vencimento',    hoje-148,'none',   false,'{"investimento"}'),
  (uid,'expense',1800.00,'Moradia',     'Aluguel',                    hoje-163,'monthly',true, '{"fixo"}'),
  (uid,'expense', 680.00,'Alimentação', 'Supermercado + ceia natal',  hoje-158,'none',   false,'{}'),
  (uid,'expense', 320.00,'Alimentação', 'Confraternização empresa',   hoje-145,'none',   false,'{}'),
  (uid,'expense', 150.00,'Transporte',  'Combustível',                hoje-156,'none',   false,'{}'),
  (uid,'expense',  49.90,'Assinaturas', 'Netflix',                    hoje-145,'monthly',true, '{"streaming"}'),
  (uid,'expense',  29.90,'Assinaturas', 'Spotify',                    hoje-145,'monthly',true, '{"streaming"}'),
  (uid,'expense', 350.00,'Saúde',       'Plano de saúde',             hoje-157,'monthly',true, '{"fixo"}'),
  (uid,'expense',1200.00,'Lazer',       'Presentes de natal',         hoje-140,'none',   false,'{"natal"}'),
  (uid,'expense', 850.00,'Lazer',       'Viagem réveillon',           hoje-135,'none',   false,'{"viagem"}');

END $$;


-- ============================================================
--  Metas financeiras demo
-- ============================================================
INSERT INTO goals
  (user_id, title, description, target_value, current_value, deadline, category, icon, color)
VALUES
  (
    'a1b2c3d4-e5f6-0000-0000-000000000001',
    'Fundo de Emergência',
    '6 meses de despesas cobertas',
    15000.00, 8500.00,
    CURRENT_DATE + INTERVAL '7 months',
    'Emergência', '🛡️', 'hsl(161 100% 45%)'
  ),
  (
    'a1b2c3d4-e5f6-0000-0000-000000000001',
    'Viagem para Europa',
    'Lisboa, Madri e Paris — 15 dias',
    20000.00, 4200.00,
    CURRENT_DATE + INTERVAL '13 months',
    'Viagem', '✈️', 'hsl(245 100% 72%)'
  ),
  (
    'a1b2c3d4-e5f6-0000-0000-000000000001',
    'MacBook Pro M4',
    'Substituir notebook atual',
    6000.00, 5400.00,
    CURRENT_DATE + INTERVAL '2 months',
    'Tecnologia', '💻', 'hsl(43 95% 58%)'
  ),
  (
    'a1b2c3d4-e5f6-0000-0000-000000000001',
    'Carteira de Ações',
    'Capital inicial para renda variável',
    50000.00, 12000.00,
    CURRENT_DATE + INTERVAL '20 months',
    'Investimento', '📈', 'hsl(193 100% 50%)'
  )
ON CONFLICT DO NOTHING;


-- ============================================================
--  Orçamentos mensais demo
-- ============================================================
INSERT INTO budgets (user_id, category, amount, period)
VALUES
  ('a1b2c3d4-e5f6-0000-0000-000000000001', 'Alimentação',  600.00, 'monthly'),
  ('a1b2c3d4-e5f6-0000-0000-000000000001', 'Lazer',        400.00, 'monthly'),
  ('a1b2c3d4-e5f6-0000-0000-000000000001', 'Transporte',   200.00, 'monthly'),
  ('a1b2c3d4-e5f6-0000-0000-000000000001', 'Assinaturas',  150.00, 'monthly'),
  ('a1b2c3d4-e5f6-0000-0000-000000000001', 'Vestuário',    300.00, 'monthly')
ON CONFLICT (user_id, category, period) DO NOTHING;


-- ============================================================
DO $$ BEGIN
  RAISE NOTICE '✅  Seeds carregados!';
  RAISE NOTICE '    Login: demo@novux.app  |  Senha: Demo@1234';
END $$;
