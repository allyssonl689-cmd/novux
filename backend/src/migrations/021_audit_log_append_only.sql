-- Migração 021: audit_log append-only (A3 da auditoria 2ª rodada, Opção A)
-- Bloqueia DELETE no audit_log para que evidências não possam ser apagadas (por
-- SQL injection, credencial vazada ou admin malicioso). UPDATE permanece permitido
-- de propósito: audit_log.user_id é ON DELETE SET NULL, então excluir um usuário
-- dispara um UPDATE na tabela — bloquear UPDATE quebraria a exclusão de conta.
--
-- Limitação: o dono da tabela/superuser ainda pode desabilitar o trigger. É defesa
-- em profundidade, não imutabilidade absoluta. Para podar logs antigos (retenção),
-- desabilite o trigger temporariamente:
--   ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_delete;  -- poda  -- depois:
--   ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_delete;
CREATE OR REPLACE FUNCTION prevent_audit_log_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é append-only: DELETE não permitido';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();
