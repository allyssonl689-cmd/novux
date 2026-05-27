-- Migração 003: Adiciona coluna paid à tabela de transações
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;
