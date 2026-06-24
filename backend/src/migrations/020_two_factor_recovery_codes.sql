-- Migração 020: códigos de recuperação do 2FA (C3 da auditoria 2ª rodada)
-- Permite ao usuário recuperar acesso quando perde o app autenticador, sem
-- ficar trancado fora da conta. Guardamos apenas o HASH (SHA-256) de cada código;
-- o texto puro é exibido uma única vez na ativação do 2FA.
CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  VARCHAR(64) NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_2fa_recovery_user ON two_factor_recovery_codes(user_id);
-- Lookup de validação: por usuário + hash, apenas códigos ainda não usados.
CREATE INDEX IF NOT EXISTS idx_2fa_recovery_lookup ON two_factor_recovery_codes(user_id, code_hash) WHERE used_at IS NULL;
