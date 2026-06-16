-- Migration 016: torna refresh_tokens.token OPCIONAL (fase 1 de 2)
-- Rodar ANTES do deploy do código novo. Com a coluna nullable, o código antigo
-- (que ainda insere `token`) e o novo (que insere só `token_hash`) coexistem sem
-- erro — deploy sem downtime. A remoção definitiva da coluna é a migration 017.
-- Executar: psql $DATABASE_URL -f 016_refresh_token_nullable.sql

ALTER TABLE refresh_tokens ALTER COLUMN token DROP NOT NULL;
