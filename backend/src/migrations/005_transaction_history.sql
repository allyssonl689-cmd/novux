-- Migração 005: Histórico de edições de transações
CREATE TABLE IF NOT EXISTS transaction_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action         VARCHAR(10) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  snapshot       JSONB NOT NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tx_history_transaction_id ON transaction_history(transaction_id);
CREATE INDEX idx_tx_history_user_id ON transaction_history(user_id);
