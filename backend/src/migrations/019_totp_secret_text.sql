-- Migração 019: alarga totp_secret para TEXT (M7 da auditoria 2ª rodada)
-- O segredo TOTP é gravado cifrado com AES-256-GCM em base64 (~80 chars para um
-- segredo base32 de 32 chars), que NÃO cabe no VARCHAR(64) original (migration 006)
-- → o setup de 2FA falhava com "value too long". TEXT remove o limite.
-- Aditiva e segura (apenas amplia o tipo; não há perda de dados).
ALTER TABLE users ALTER COLUMN totp_secret TYPE TEXT;
