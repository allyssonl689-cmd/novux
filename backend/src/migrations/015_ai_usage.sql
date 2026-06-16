-- Migration 015: contador diário de uso da IA persistido no banco
-- Substitui o Map em memória do aiController (que zerava a cada deploy e divergia
-- entre instâncias). Uma linha por usuário/dia; o limite free é checado contra ela.
-- Executar: psql $DATABASE_URL -f 015_ai_usage.sql

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE        NOT NULL,
  count      INT         NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

-- Limpeza opcional de registros antigos (configurar pg_cron, se disponível):
-- DELETE FROM ai_usage WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
