-- 014: Contador de tentativas no desafio 2FA (lockout por sessão)
-- Permite limitar tentativas de código TOTP por tempToken, mitigando brute force.
ALTER TABLE pending_2fa
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
