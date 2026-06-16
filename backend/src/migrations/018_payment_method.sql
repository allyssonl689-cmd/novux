-- Migration 018: forma de pagamento/recebimento nas transações
-- Aditiva e segura (colunas opcionais) — o código antigo ignora; o novo as usa.
-- Rodar ANTES do deploy do código novo. Executar: psql $DATABASE_URL -f 018_payment_method.sql

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS paid_at        DATE,
  ADD COLUMN IF NOT EXISTS payment_notes  TEXT;
