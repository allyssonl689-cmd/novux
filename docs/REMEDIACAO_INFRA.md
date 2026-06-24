# Remediação — itens de infra/decisão (2ª rodada de auditoria)

> Passo a passo dos achados que dependem de ação sua no Supabase/Render (não dá para
> resolver só no código). Ordenados do mais simples ao mais complexo.

---

## M6 (parte do banco) — validar o certificado TLS do Postgres

**Status do código:** já pronto. O backend usa `DATABASE_CA_CERT` (PEM) quando presente
→ valida o certificado (`rejectUnauthorized: true`). Sem ele, nada muda (sem risco).

**Passos:**
1. No Supabase: **Project Settings → Database → SSL Configuration** → baixe o certificado
   CA (`prod-ca-2021.pem`, ou o "SSL Certificate" oferecido ali).
2. No **Render** (serviço do backend) → **Environment** → adicione a variável
   `DATABASE_CA_CERT` com o **conteúdo PEM inteiro** (começa em `-----BEGIN CERTIFICATE-----`).
   - Dica: no Render dá para colar valor multilinha. Se preferir uma linha só, troque as
     quebras por `\n` — o Node aceita o PEM com `\n` literais.
3. Salve → o Render redeploya. Confira o `/health` (deve continuar `db: connected`).
   Se a conexão falhar, o CA está errado — **remova a variável** para voltar ao estado atual.

> Risco: baixo (reversível removendo a env). Faça fora de horário de pico por garantia.

---

## A3 — tornar o `audit_log` à prova de adulteração (append-only)

Hoje o `audit_log` pode ser **apagado/alterado** pela mesma conexão da aplicação (privilégio
total). Quem comprometer o banco apaga as evidências.

**⚠️ Decisão necessária — duas abordagens:**

### Opção A (recomendada p/ começar) — trigger que bloqueia DELETE
Bloqueia `DELETE` no `audit_log` (o vetor de destruição de evidências), mas **permite UPDATE**
— necessário porque `audit_log.user_id` é `ON DELETE SET NULL` (excluir um usuário gera um
UPDATE na tabela). SQL para rodar no **SQL Editor do Supabase**:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é append-only: DELETE não permitido';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();
```
- **Limitação:** o dono da tabela/superuser ainda pode desabilitar o trigger. É defesa em
  profundidade, não imutabilidade absoluta. Também **impede a poda de logs antigos** — se um
  dia precisar (retenção/LGPD), desabilite o trigger temporariamente, pode, e reabilite.

### Opção B (mais robusta) — role separado só-INSERT
Criar um role de aplicação **sem** privilégio de `DELETE`/`UPDATE` no `audit_log` e fazer o
backend conectar com ele. Mais seguro (nem o app consegue apagar), mas exige gerenciar um
segundo role/credencial no Supabase + ajustar a `DATABASE_URL`. Maior esforço.

**Recomendo a Opção A agora** (rápida, reversível) e a B como evolução. Me diga qual e eu
preparo (no caso da A, viro o SQL acima em migration `021`; na B, te guio na criação do role).

---

## C1 — Row Level Security (RLS) no Postgres  🔴 maior item

**Contexto honesto:** hoje o isolamento entre usuários é feito **100% no código** (todo
`SELECT/UPDATE/DELETE` filtra por `user_id`) — e a 1ª auditoria confirmou que isso está
**bem feito** (sem IDOR conhecido). Então **não é um vazamento ativo**; a RLS é uma **segunda
camada** (defesa em profundidade) para o caso de uma query esquecer o filtro ou um SQL
injection. Importante, mas pode ser planejada com calma.

**Por que não é um toggle:** a app conecta com **uma conexão privilegiada única** (pooler do
Supabase). Para a RLS funcionar de verdade são necessárias 3 coisas juntas:
1. **Policies** nas tabelas com `user_id` (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY USING (user_id = current_setting('app.user_id')::uuid)`).
2. **Contexto por request:** cada request precisa rodar suas queries com `SET LOCAL app.user_id = '<uuid>'` **dentro de uma transação** (senão o GUC vaza entre requests do pool). Isso é mudança no acesso a dados (envolver as queries autenticadas numa transação com o SET LOCAL).
3. **Role sem bypass:** o role que a app usa **não pode** ser dono das tabelas nem ter `BYPASSRLS` (no Supabase, o role padrão costuma ignorar RLS) — exige um role dedicado.

**Risco:** se ligar as policies sem (2) e (3) corretos, **todas as queries retornam vazio**
(ou o role ignora a RLS e não protege nada). Por isso precisa ser faseado.

**Roteiro faseado sugerido (eu faço o código; você faz o Supabase):**
1. **Decisão:** topa o modelo `SET LOCAL app.user_id` por request? (alternativa: migrar o
   data layer para o cliente Supabase com JWT — refactor bem maior; **não recomendo agora**).
2. Eu adapto o `authMiddleware`/camada de dados para abrir uma transação por request
   autenticado e setar `SET LOCAL app.user_id`. (Mudança transversal — faço com cuidado + testes.)
3. Migration que habilita RLS + policies, aplicada **primeiro em staging** / numa tabela
   piloto (ex.: `transactions`) para validar antes de estender a todas.
4. Você cria/configura no Supabase o role de aplicação sujeito à RLS e ajusta a `DATABASE_URL`.
5. Rollout gradual tabela a tabela, com plano de rollback (desabilitar a policy).

**Recomendação:** tratar C1 como um mini-projeto à parte, depois que o resto estiver mergeado
e estável em produção. Quando você decidir, começamos pela tabela `transactions` como piloto.

---

## Status final (2026-06-24)

**✅ Concluído e em produção (branch mergeada na `main`; CI verde):**
- **M6-banco** — `DATABASE_CA_CERT` setado no Render; `/health` = `db: connected` (TLS do banco validado).
- **M6-SMTP** — `rejectUnauthorized: true`.
- **A3** — migration **021** aplicada (trigger `audit_log_no_delete`, append-only via Opção A).
- **C2/A1/A2/C4/A5/C3** + **M1/M2/M3/M7** + **B1/B2/B3/B4** + **SCA** (multer/dompurify/nodemailer → 0 vulns) + **lint-gate** do backend no CI.
- Migrations aplicadas pelo usuário no Supabase: **019, 020, 021**.

**⏳ Único item de segurança em aberto:**
- **C1 — RLS no Postgres.** Mini-projeto faseado (ver seção acima). **Não é vazamento ativo** — o IDOR já é mitigado no código (filtro `user_id` em toda query, confirmado na 1ª auditoria); a RLS é 2ª camada (defesa em profundidade). Começar pela tabela `transactions` como piloto quando o modelo (passo 1) for decidido. Sem urgência.

**↩️ Adiados por decisão:**
- **B5** — chave HMAC separada da `ENCRYPTION_KEY` (exige re-hash dos `email_hash` existentes → backfill).
- **A4** — não retornar o `secret` TOTP no setup (o segredo já vai embutido no `qrDataUrl`; fix real = servir QR por endpoint autenticado).
