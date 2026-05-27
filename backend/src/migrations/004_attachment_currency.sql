-- Migração 004: Adiciona attachment_url e currency às transações
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'BRL';
