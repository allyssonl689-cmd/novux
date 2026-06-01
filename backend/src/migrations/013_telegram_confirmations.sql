-- Migração 013 — Confirmações pendentes do bot Telegram
-- Persiste no banco as transações aguardando confirmação do usuário,
-- evitando perda de estado quando o servidor reinicia (Render free tier).

CREATE TABLE IF NOT EXISTS pending_telegram_tx (
  chat_id     BIGINT      PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parsed_data JSONB       NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Limpa confirmações expiradas automaticamente (executar periodicamente via cron ou ON INSERT)
CREATE INDEX IF NOT EXISTS idx_pending_telegram_expires ON pending_telegram_tx(expires_at);
