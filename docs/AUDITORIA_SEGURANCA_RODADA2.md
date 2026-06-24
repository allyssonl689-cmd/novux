# Auditoria de Segurança — 2ª Rodada (áreas fora do escopo da 1ª)

> **Tipo:** Auditoria SOMENTE-LEITURA (nenhum arquivo de código foi alterado).
> **Data:** 24 de junho de 2026.
> **Método:** 4 auditores em paralelo (Admin/RBAC, OAuth Google, Fluxo 2FA, Audit log + E-mail + Banco/RLS) + `npm audit` (SCA) front e back.
> **Status:** achados levantados; **nenhuma correção aplicada** (aguardando priorização do usuário).
> Achados marcados como ✅ **VERIFICADO** foram confirmados por leitura direta do código/matemática nesta sessão.

---

## Status de remediação (atualizado 24/06/2026)

**✅ Corrigidos na branch (commits `bb978a4`, `abc6c98`):**
- **C2 + A1 + M4 + M5 + B6** — login Google: grava só `token_hash`; valida `email_verified`+`iss`; seta `email_verified=TRUE`; reutiliza `setRefreshCookie` (`sameSite` none/lax); `authLimiter` na rota.
- **A2** — escape de HTML do nome nos e-mails + `registerSchema` rejeita `<`/`>`.
- **C4** — `POST /2fa/disable` exige senha (bcrypt) além do TOTP (front atualizado); OAuth-only dispensado.
- **A5** — `authLimiter` nas rotas `/2fa/*`.

**🟢 Teste de produção (24/06):** login Google retorna **503** (sem `GOOGLE_CLIENT_ID` em prod) → o bug C2 estava **latente** (feature desligada), não ativo. Correção mantida para quando o Google for habilitado.

**↩️ Reavaliado:** **A4** (não retornar `secret` no setup) — **adiado**: o `secret` já vai embutido no `qrDataUrl` (otpauth URI) que é retornado de qualquer forma, então remover só o campo não fecha a exposição e quebraria a entrada manual. Fix real = servir QR por endpoint autenticado (revisitar com C3/recovery codes).

**⏳ Pendentes (próximos):** C1 (RLS — infra), C3 (recovery codes — maior), A3 (audit log append-only — infra), M1/M2/M3/M6/M7/B1-B6, SCA (`npm audit fix`).

---

## Placar

| Severidade | Qtd | Itens |
|---|---|---|
| 🔴 Crítico | 4 | Sem RLS no Postgres · Login Google quebrado em prod + refresh em texto puro · 2FA: sem recovery codes · 2FA: disable/setup sem reautenticação por senha |
| 🟠 Alto | 5 | Account-takeover via Google (`email_verified`) · Injeção HTML/phishing em e-mail via `name` · Audit log mutável/sem integridade · Segredo TOTP retornado em claro no setup · 2FA verify/disable/setup sem lockout |
| 🟡 Médio | 7 | PII em claro no audit log · `/admin/users` expõe e-mails decifrados · Sem rate-limit em admin · Sem rate-limit em `/auth/google` · Cookie Google `sameSite:'strict'` · TLS de banco/SMTP sem validar cert · Coluna `totp_secret VARCHAR(64)` curta |
| 🟢 Baixo | 6 | Cobertura de auditoria incompleta · URL de reset em log no fallback · `requireAdmin` sem try/catch · Validação TOTP permissiva · Reuso de `ENCRYPTION_KEY` p/ HMAC · flag `email_verified` inconsistente p/ Google |
| 📦 SCA | 4 | `multer` (high) · `nodemailer` (high) · `dompurify` via jsPDF (moderate) · `undici` via jsdom (dev) |

---

## 🔴 Críticos

### C1. Ausência total de Row Level Security (RLS) no Postgres/Supabase ✅ VERIFICADO
**Banco.** Nenhuma das 19 migrations habilita RLS (`ENABLE ROW LEVEL SECURITY`/`CREATE POLICY` = 0 ocorrências). O isolamento entre usuários depende **100%** do `WHERE user_id = $1` na aplicação, com uma **única conexão privilegiada** (`config/database.ts:14`).
- **Risco:** qualquer query que esqueça o filtro `user_id` vaza dados entre contas (IDOR) sem rede de proteção; uma SQL injection ou vazamento da `DATABASE_URL`/`SERVICE_ROLE_KEY` expõe todos os dados de todos os usuários e o próprio `audit_log`.
- **Recomendação:** habilitar RLS nas tabelas com `user_id` e policies `USING (user_id = current_setting('app.user_id')::uuid)` com `SET LOCAL` por request; ou, no mínimo, um role de aplicação sem bypass de RLS. **Parte sua (infra Supabase) + minha (código do `SET LOCAL`).**

### C2. Login com Google quebrado em produção + refresh token em texto puro ✅ VERIFICADO
**OAuth.** `routes/authGoogle.ts:82` faz `INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at)` — a coluna **`token` foi removida pela migration 017** (já aplicada em prod). O login normal já grava só `token_hash` (`authService.ts:366`); a rota Google ficou para trás.
- **Risco:** em produção o INSERT lança erro → **500** (login Google indisponível). Onde a coluna ainda existir, grava o refresh token em **texto puro** (o exato problema que a 017 eliminou).
- **Recomendação:** remover `token` do INSERT (gravar só `token_hash`); idealmente delegar a emissão de sessão a uma função compartilhada com o login normal. **Minha parte (código).** Correção rápida e de alto valor.

### C3. 2FA — ausência total de recovery/backup codes ✅ VERIFICADO
**2FA.** Não há geração/armazenamento/consumo de recovery codes; o `loginWith2FA` só aceita TOTP (`authService.ts:154`). O comentário em `authValidators.ts` ("tolerar recovery codes") é enganoso — nenhum é validado.
- **Risco:** perda/troca do dispositivo autenticador = **lockout permanente** da conta; incentiva desativar 2FA por canais inseguros.
- **Recomendação:** gerar N códigos de uso único no `verify`, exibir uma vez, armazenar só o hash, aceitar como alternativa ao TOTP no login. **Minha parte (código) + migration.**

### C4. 2FA — desabilitar e reconfigurar sem reautenticação por senha ✅ VERIFICADO
**2FA.** `POST /2fa/disable` (`twoFactorController.ts:55-75`) e `POST /2fa/setup` (`:10-31`) exigem só access token + (no disable) um TOTP atual — **nunca pedem a senha**. `setup` é repetível e sobrescreve o segredo enquanto `totp_enabled=false`.
- **Risco:** cadeia explorável a partir de uma **sessão comprometida** (XSS, token vazado): re-setup (#) → vincular autenticador do atacante, ou disable → remover o 2FA, **sem nunca reprovar a senha**. O 2FA deixa de proteger contra comprometimento de sessão.
- **Recomendação:** exigir `currentPassword` (bcrypt.compare) em `disable`, `setup` e `verify`, como o `changePassword` já faz. **Minha parte (código).**

---

## 🟠 Altos

### A1. Account-takeover via Google: não valida `email_verified` do payload ✅ VERIFICADO
`authGoogle.ts:31-57` valida assinatura/`aud`/exp (bom), mas **não checa `payload.email_verified`** e vincula/loga em qualquer conta local existente com o mesmo e-mail, **sem prova de posse**. Recomendação: rejeitar `email_verified !== true`; validar `iss`; exigir confirmação ao unir identidade Google ↔ conta local com senha.

### A2. Injeção de HTML/phishing em e-mails via `name` ✅ VERIFICADO
`emailService.ts` interpola `firstName` no HTML sem escape (linhas ~88/113/144) e `registerSchema` só valida tamanho do `name` (sem restrição de caracteres). Um nome como `<a href="https://phish">clique</a>` é injetado no corpo de e-mails legítimos do Novux. Recomendação: escapar HTML do `firstName` e/ou restringir caracteres no `registerSchema`. **Minha parte (código).**

### A3. Audit log mutável / sem integridade ✅ VERIFICADO
`audit_log` é tabela comum gravada pela conexão de app com privilégio total; sem append-only, sem hash-chain, sem WORM. Um atacante/admin pode `DELETE FROM audit_log` e apagar evidências — anula o valor probatório (citado como compliance LGPD). Recomendação: role só-INSERT ou trigger anti-UPDATE/DELETE; idealmente hash-chain + export imutável. **Parte sua (infra DB) + minha.**

### A4. Segredo TOTP retornado em texto claro no setup ✅ VERIFICADO
`twoFactorController.ts:27` devolve `{ qrDataUrl, secret }` — o `secret` base32 em claro no corpo, podendo cair em logs/APM/cache do cliente. O `qrDataUrl` já basta. Recomendação: não retornar `secret`. **Minha parte (código + ajuste no front).**

### A5. 2FA verify/disable/setup sem lockout de brute force ✅ VERIFICADO
O lockout (migration 014, `attempts`) existe **só** no `loginWith2FA`. `verify`/`disable`/`setup` chamam `verifySync` sem contador nem rate-limiter dedicado (rotas `/2fa/*` só têm `authenticate`). Recomendação: aplicar lockout por usuário e rate-limiter nas rotas `/2fa/*`. **Minha parte (código).**

---

## 🟡 Médios

| # | Achado | Local | Recomendação |
|---|---|---|---|
| M1 | PII (e-mail/nome) em **texto puro** no audit log (`register` grava `name`; `login_failed` grava `email`) — contorna a cifra de PII da migration 012 | `authService.ts:55,78` | Gravar `email_hash`/`user_id`, nunca PII em claro |
| M2 | `/api/admin/users` retorna **e-mails+nomes decifrados** de toda a base | `UserModel.listAll` + `adminController.ts:48` | Mascarar e-mail na listagem; PII só em detalhe auditado; `Cache-Control: no-store` |
| M3 | Rotas `/api/admin` **sem `dataLimiter`** (só global por IP) | `routes/admin.ts:20` | Aplicar `dataLimiter` (ou mais restritivo) |
| M4 | `POST /api/auth/google` **sem rate-limit** específico | `authGoogle.ts:17` | Aplicar `authLimiter` |
| M5 | Cookie de refresh do Google `sameSite:'strict'` — **não envia** em cross-site (Vercel→Render), quebra o refresh | `authGoogle.ts:89` | Reutilizar `setRefreshCookie` (`'none'`/`'lax'`) |
| M6 | TLS sem validar certificado: banco (`DATABASE_SSL_REJECT_UNAUTHORIZED=false` default) e SMTP (`rejectUnauthorized:false`) | `env.ts:25`, `emailService.ts:53` | Fornecer CA do Supabase e `rejectUnauthorized:true` |
| M7 | Coluna `totp_secret VARCHAR(64)` **curta** — segredo cifrado tem 80 chars ✅ VERIFICADO (math) | `migrations/006_totp_2fa.sql:2` | `ALTER ... TYPE TEXT`; conferir schema real em prod (setup pode estar quebrado/nunca exercido) |

---

## 🟢 Baixos

- **B1.** Auditoria não cobre ações sensíveis: 2FA enable/disable, telegram link/unlink, mudança de plano, `admin/users`, export de dados (tipos `totp_enabled`/`totp_disabled` existem mas nunca são emitidos). Rótulo `admin_view_users` está trocado no endpoint de métricas.
- **B2.** `emailService.ts:169` faz `console.warn` da **URL de reset** em texto puro no fallback sem provedor (o `authService` foi cuidadoso em nunca logar).
- **B3.** `requireAdmin` (`routes/admin.ts:8-18`) é `async` sem try/catch (falha de banco pode pendurar/propagar de forma inconsistente). Falha **nega** acesso (não é bypass).
- **B4.** `totpTokenSchema` aceita 6–10 chars sem regex de dígitos — restringir a `^\d{6}$` enquanto não houver recovery codes.
- **B5.** `email_hash`/HMAC reusa a `ENCRYPTION_KEY` como chave HMAC (`encryption.ts:62`) — derivar chaves separadas (HKDF) ou variável dedicada.
- **B6.** Conta criada via Google fica `email_verified=false` no banco (front mascara com `?? true`) — setar `TRUE` após validar o payload.

---

## 📦 SCA (dependências vulneráveis) ✅ VERIFICADO

| Pacote | Sev | Origem | Correção |
|---|---|---|---|
| `multer` 1.x | **High** | direta (uploads) — DoS via nested fields / cleanup de upload abortado | `npm audit fix` → multer 2.x (não-breaking). Já migramos p/ `memoryStorage`; baixo risco de regressão |
| `nodemailer` ≤9.0.0 | **High** | direta (fallback SMTP) — `raw` permite leitura de arquivo + SSRF | `npm audit fix --force` → 9.0.1 (**breaking**); avaliar (caminho principal é Brevo HTTP) |
| `dompurify` ≤3.4.10 | Moderate | **transitiva via `jspdf@4.2.1`** (não usado direto) — bypasses de XSS em modo IN_PLACE | `npm audit fix`; risco real baixo (não usamos IN_PLACE direto) |
| `undici` | High | **transitiva via `jsdom` (devDependency)** — não vai a produção | atualizar quando conveniente |

---

## Pontos fortes confirmados (não regredir)

- **RBAC correto:** `is_admin` vem do **banco** a cada request (`routes/admin.ts:9`), nunca do token; sem rota de promoção a admin via API; endpoints admin são só-leitura e paginados.
- **2FA — base criptográfica sólida:** segredo cifrado AES-256-GCM; `tempToken` 32 bytes só-hash, expira em 5 min e é consumido (sem replay); lockout no login (5 tentativas); janela TOTP **0** (sem tolerância); `verifySync` em tempo constante; login com 2FA não emite sessão antes do 2º fator.
- **OAuth — verificação do ID token correta** (assinatura/`aud`/exp via `google-auth-library`); conta Google não troca senha nem entra no fluxo de reset.
- **E-mail — tokens fortes:** reset/verificação com `randomBytes(32)`, hash SHA-256, expiração, `used`, sem user-enumeration no forgot-password; sem SSRF (endpoint Brevo fixo).
- **Refresh token (login normal):** só hash, rotação com detecção de reuso e revogação global.

---

## Sequência de remediação sugerida

**Correções de código rápidas e de alto valor (minha parte):**
1. **C2** — corrigir o INSERT do login Google (remover `token`) → restaura o login Google em prod. *(rápido)*
2. **C4 + A5** — exigir senha em `disable`/`setup`/`verify` + lockout nas rotas `/2fa/*`. *(médio)*
3. **A4** — parar de retornar o `secret` TOTP em claro. *(rápido)*
4. **A2** — escapar HTML do `name` nos e-mails + restringir caracteres no `registerSchema`. *(rápido)*
5. **A1 + M5 + M4 + B6** — hardening do login Google (validar `email_verified`/`iss`, `setRefreshCookie`, `authLimiter`, setar `email_verified`). *(médio — idealmente unificar com o pipeline do login normal)*
6. **M2 + M3 + B1 + B3** — admin: mascarar PII, `dataLimiter`, auditar `users`, try/catch.
7. **M1 + B2** — parar de gravar PII em claro no audit log e a URL de reset no log.
8. **C3** — recovery codes (maior: código + migration + UI).
9. **SCA** — `npm audit fix` (multer/dompurify, não-breaking); avaliar nodemailer 9.

**Parte sua (infra/decisão):**
- **C1 (RLS)** — habilitar no Supabase + eu adiciono o `SET LOCAL` por request. Decisão de arquitetura.
- **A3** — role só-INSERT / trigger anti-delete no `audit_log`.
- **M6** — CA do Supabase para validar TLS do banco; `rejectUnauthorized:true` no SMTP.
- **M7** — confirmar o tipo real da coluna `totp_secret` em produção (setup de 2FA pode estar quebrado) e `ALTER ... TYPE TEXT`.
