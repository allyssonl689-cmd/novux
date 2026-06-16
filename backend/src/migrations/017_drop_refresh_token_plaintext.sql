-- Migration 017: remove a coluna refresh_tokens.token em texto puro (fase 2 de 2)
-- ⚠️ Rodar SOMENTE APÓS o deploy do código novo estar no ar e funcionando
-- (login/refresh OK). A partir daqui, nenhum refresh token fica legível no banco —
-- só o hash SHA-256 (token_hash). Dropar a coluna remove também o índice/único.
-- Executar: psql $DATABASE_URL -f 017_drop_refresh_token_plaintext.sql

ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS token;
