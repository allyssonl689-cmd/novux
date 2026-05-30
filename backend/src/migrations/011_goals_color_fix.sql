-- Migração 011: Expandir coluna color em goals para suportar qualquer formato de cor
-- Execute no Supabase SQL Editor

ALTER TABLE goals ALTER COLUMN color TYPE TEXT;
