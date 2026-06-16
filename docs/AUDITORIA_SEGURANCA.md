# Auditoria de Segurança e Saúde do Projeto — Novux Finance

> **Tipo:** Auditoria somente-leitura (nenhum arquivo de código foi alterado).
> **Data:** 11 de junho de 2026
> **Método:** 4 agentes especializados em paralelo — Segurança, Arquitetura, Backend e UX.
> **Foco:** Saúde geral do projeto.
> **Convergência:** achados marcados com o nº de agentes que os confirmaram independentemente (quanto mais agentes, maior a confiança).

---

---

## 🛠️ Status das correções (branch `fix/auditoria-bloco-rapidas`)

Aplicado em 11/06/2026 — type-check de front e back **limpo** (`tsc --noEmit` exit 0). Nenhuma alteração de schema/produção foi feita.

### Bloco 1 — "Rápidas" (segurança + dívida técnica)
| Item | Achado | Status |
|---|---|---|
| #2 | Bug do token (upload + export CSV) → `tokenStore.get()` | ✅ Corrigido |
| #1 | `isPremium` agora derivado de `users.plan` no servidor | ✅ Corrigido |
| #15 | Timeout (12s) + truncamento do contexto na chamada Groq | ✅ Corrigido |
| #10 | `db.on('error')` não chama mais `process.exit(1)` | ✅ Corrigido |
| #16 | Reset de senha com validação de força (Zod) | ✅ Corrigido |
| #23 | Removido log de URLs/tokens de reset e verificação | ✅ Corrigido |
| — | Branding "Sapiens Finance" → "Novux Finance" | ✅ Corrigido |
| — | `Calendar` importado em `MainLayout` (time-bomb) | ✅ Corrigido |

### Bloco 2 — UX de baixo risco
| Item | Achado | Status |
|---|---|---|
| #7 | Confirmação de exclusão (transações e metas) via novo `ConfirmDialog` (Radix, com a11y) | ✅ Corrigido |
| #8 | Erro de carga não silenciado: banner "servidor iniciando" + "Tentar novamente" no `MainLayout` | ✅ Corrigido |
| #21 | Toasts (Sonner) no CRUD: criar/editar/excluir transação, salvar/excluir meta, toggle pago | ✅ Corrigido |

### Bloco 3 — Regime de caixa (decisão de produto)
**Decisão do usuário:** saldo por **regime de caixa** (só lançamentos realizados/`paid` entram no saldo).
| Item | Achado | Status |
|---|---|---|
| #14 | `getSummary` agora separa realizado/pendente; `balance` = caixa (realizado). Telegram `/saldo` e `/resumo` mostram recebido/pago + saldo (caixa) e pendências. Dashboard "Saldo do Mês" e taxa de poupança passam a usar o saldo realizado. | ✅ Corrigido |

### Bloco 4 — Frontend: performance + acessibilidade
| Item | Achado | Status |
|---|---|---|
| #25 | Lazy loading de rotas (`React.lazy` + `Suspense`). Build confirma code-splitting: cada página em chunk próprio; Recharts (~380 kB), jsPDF (~407 kB) e html2canvas (~200 kB) saem do bundle inicial. | ✅ Corrigido |
| #20 | `TransactionForm` com a11y essencial: `role="dialog"`, `aria-modal`, `aria-labelledby`, fecha no Escape, foco entra no modal ao abrir, `aria-label` no botão fechar. (Focus trap completo fica para migração futura ao Radix Dialog.) | ✅ Parcial |
| baixos | `<a href>` interno → `<Link>` no Dashboard; `window.location.href` → `useNavigate` no menu do avatar (navegação SPA, sem full reload); `aria-label` nos botões de excluir. | ✅ Corrigido |

### Bloco 5 — Backend hardening (uploads + 2FA)
| Item | Achado | Status |
|---|---|---|
| #3 | **Uploads autenticados:** removido `express.static('/uploads')` (público). Anexos agora servidos por `GET /api/transactions/:id/attachment`, que valida o dono (`user_id`), resolve só o basename (anti path traversal) e envia com `X-Content-Type-Options: nosniff`. Frontend passa a abrir o comprovante via fetch autenticado (blob). | ✅ Corrigido |
| #22 | **Limpeza de uploads órfãos:** falha pós-upload (transação inexistente) remove o arquivo; troca de anexo remove o antigo; exclusão da transação remove o arquivo. Util `utils/uploads.ts`. | ✅ Corrigido |
| #17 | **Lockout 2FA:** `/login/2fa` conta tentativas de TOTP por sessão (coluna `pending_2fa.attempts`); após 5 falhas a sessão de 2FA é invalidada (HTTP 429). Persistido em banco (multi-instância). | ✅ Corrigido |

### Bloco 6 — Backend: atomicidade, migrations e contador de IA
| Item | Achado | Status |
|---|---|---|
| #11 | **Transações DB atômicas:** novo helper `withTransaction` em `config/database.ts` (BEGIN/COMMIT/ROLLBACK + release garantido). `TransactionModel.create/update/delete` envolvem escrita + `logHistory` numa única transação; novo `createMany` torna a recorrência mensal atômica (Telegram passa a usá-lo — antes era `Promise.all` de N inserts independentes). `authService.register` (usuário + token de verificação), `changePassword`, `forgotPassword` e `resetPassword` (senha + invalidação de sessões) também ficam atômicos. Remoção de arquivo de anexo no `delete` só após o COMMIT. | ✅ Corrigido |
| #12 | **Migrations desambiguadas:** o runner (`run.ts`) agora só aplica arquivos no padrão `NNN_*.sql` — scripts de setup manual (`ALL_MIGRATIONS.sql`, `novux_migration.sql`, `novux_seeds.sql`) foram movidos para `migrations/manual/` (com README próprio) e não rodam mais automaticamente. README atualizado. Os duplicados `009_`/`010_` foram **mantidos** (renomear reexecutaria em bancos já migrados) com nota explicativa. | ✅ Corrigido |
| #13 | **Contador de IA persistido:** `aiController` deixa de usar `Map` em memória (que zerava a cada deploy e divergia entre instâncias). Nova tabela `ai_usage` (uma linha por usuário/dia); leitura e incremento atômico via `INSERT ... ON CONFLICT DO UPDATE`. | ✅ Corrigido |

> ⚠️ **Ação necessária (sua parte):** rodar a migration **`015_ai_usage.sql`** no banco antes/junto do deploy do backend — sem a tabela `ai_usage`, o endpoint de chat da IA falha.
> ⚠️ **Ação necessária (sua parte):** rodar a migration **`014_pending_2fa_attempts.sql`** no banco antes/junto do deploy do backend — sem a coluna `attempts`, o endpoint `/login/2fa` falha.
> ℹ️ **Persistência de anexos:** o acesso agora é seguro, mas os arquivos seguem em disco **efêmero** no Render (somem a cada deploy). Migrar para storage externo (S3/Supabase Storage) continua sendo sua parte.

Demais itens permanecem **pendentes** (ver listas abaixo). O achado crítico do **refresh token** foi verificado e **confirmado**, mas sua correção exige mudança de schema/produção — fora dos blocos rápidos.

---

## Índice

- [Divergência a resolver](#divergência-a-resolver)
- [Críticos / Altos](#-críticos--altos-resolver-já)
- [Médios](#-médios)
- [Baixos / dívida técnica](#-baixos--dívida-técnica)
- [Pontos fortes](#-pontos-fortes-consenso)
- [Escopo fora desta avaliação](#-escopo-fora-desta-avaliação)
- [Sequência recomendada](#-sequência-recomendada-de-correção)

---

## Divergência a resolver

Os agentes de **Segurança** e **Arquitetura/Backend** leram o mesmo código de refresh token e chegaram a conclusões **opostas**:

| Agente | Leitura de `backend/src/services/authService.ts` |
|---|---|
| 🔴 Segurança | "**Não** há rotação; refresh token gravado em **texto puro** na coluna `token`" |
| 🟢 Arquitetura/Backend | "Rotação **correta**; refresh por **hash SHA-256**; invalidação em troca de senha" |

### ✅ Veredito (verificado em 11/06/2026 — leitura direta do código)

**O agente de Segurança estava correto.** Confirmado em `authService.ts`:

- **`issueTokens` (linhas 317-321):** `INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at)` — o refresh token **é gravado em texto puro** na coluna `token`, além do hash SHA-256.
- **`refresh` (linhas 158-171):** apenas valida e emite um novo *access token* — **não há rotação** do refresh token (o mesmo vale 7 dias). O `SELECT` usa `WHERE (token_hash = $1 OR token = $2)`, confirmando que a coluna em texto puro é consultada.

**Conclusão:** o achado **CRÍTICO procede** — um dump/leitura do banco (Supabase) expõe credenciais de sessão reutilizáveis por 7 dias, sem necessidade de quebrar hash. O agente de Arquitetura interpretou mal (viu o `token_hash` e assumiu que era a única coluna).

**Correção (NÃO incluída no bloco "Rápidas" — toca schema + auth de produção):**
1. Parar de gravar a coluna `token` em claro em `issueTokens` (gravar só `token_hash`).
2. Remover o `OR token = $2` das queries de `refresh` e `logout`.
3. Implementar rotação: a cada `refresh`, emitir novo refresh token, invalidar o antigo e re-setar o cookie; idealmente com detecção de reuso.
4. Migration para remover/anular a coluna `token` (requer execução no banco de produção — **sua parte**).

---

## 🔴 Críticos / Altos (resolver já)

### 1. ✅ [CORRIGIDO] `isPremium` vem do cliente → bypass de paywall e quota da IA
**3 agentes (Segurança, Arquitetura, Backend).** `backend/src/controllers/aiController.ts:30,42`
Qualquer usuário envia `{"isPremium": true}` no body e ganha chamadas Groq ilimitadas — burla o limite free e gera **custo financeiro real**.
**Correção:** derivar `isPremium` no servidor a partir de `users.plan` (`req.userId`), nunca do body.

### 2. ✅ [CORRIGIDO] 🐛 Bug que quebra features: token inexistente em upload e export CSV
**3 agentes (Segurança, Arquitetura, UX).** `src/services/transactionService.ts:121,148`
`uploadAttachment` e `exportCSV` leem `localStorage.getItem('novux_access_token')` — chave **nunca gravada** (o app usa token em memória). Resultado: `Bearer null` → anexar comprovante e exportar CSV estão **quebrados** (401).
**Correção:** usar `tokenStore.get()` de `api.ts` nas duas funções.

### 3. ✅ [CORRIGIDO] Comprovantes financeiros servidos publicamente sem autenticação
**2 agentes (Segurança, Backend).** `backend/src/app.ts` (`express.static('uploads')`)
Recibos em `/uploads/<hex>.ext` acessíveis por URL sem checar dono nem expiração. No Render o disco é **efêmero** — anexos somem a cada deploy.
**Correção:** servir por rota autenticada que valida `user_id` dono; migrar para storage externo.

### 4. ✅ [CORRIGIDO] Frontend lê só 500 transações e calcula tudo em memória → dados ERRADOS
**Arquitetura.** `src/contexts/FinanceContext.tsx:29`
Com >500 lançamentos, saldos e relatórios ficam **incorretos** (não só lentos).
**Etapa A (commit `8723fe4`):** `FinanceContext` migrado para **TanStack Query** (resolve também #18) e passa a paginar a API até carregar o histórico completo (não mais o recorte de 500) — correção numérica imediata em todas as telas. Cache por usuário; mutações atualizam o cache.
**Etapa B (commits `f78f402` · `b982e9f` · `7cd951a`):** agregados **server-side**. Backend ganhou `/api/reports/summary` (com período anterior p/ deltas + categorias), `/api/reports/monthly-breakdown` (série mensal all-time com status de pagamento) e `/api/transactions/tags`; `findAll` aceita `categories` (match exato) e `sort`. Dashboard e Relatórios passam a consumir esses endpoints (corretos em qualquer volume, sem recalcular sobre o array). Tela de Lançamentos com **paginação server-side real** (`useInfiniteQuery` + "Carregar mais"): período, tipo, categorias, tags, busca (debounce) e ordenação aplicados no servidor.
**Resta (fora de #4):** `insights`/`SmartIndicators`/`AIInsights` ainda consomem o array completo do `FinanceContext` — mover esses para server-side é evolução separada.

### 5. ✅ [CORRIGIDO] Busca textual descriptografa a tabela inteira (DoS trivial)
**2 agentes (Arquitetura, Backend).** `backend/src/models/TransactionModel.ts:70-90`
Com `search`, faz `SELECT *` sem `LIMIT`, descriptografa TUDO e filtra em JS.
**Correção aplicada:** teto de varredura `SEARCH_SCAN_LIMIT = 1000` — os filtros estruturados (type/category/date/tags) vão ao SQL e a busca textual passa a descriptografar no máximo as 1000 transações mais recentes que casam, eliminando a descriptografia ilimitada. Substring preservado. (Índice HMAC/`tsvector` permanece como evolução futura: exigiria coluna determinística + backfill dos dados já cifrados, e só daria match por palavra inteira — mudança de schema + UX.)

### 6. 🔐 Segredos de produção em `backend/.env` dentro de pasta OneDrive sincronizada
**Segurança.** Os `.env` **não** estão no git (✅), mas o `backend/.env` real (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GROQ_API_KEY`, `SMTP_PASS`, `ENCRYPTION_KEY`) está dentro de `OneDrive - Empreendimentos Farmacêuticos Globo` → replicado para nuvem corporativa.
**Correção:** mover o projeto para fora do OneDrive (ou dessincronizar o `.env`) e **rotacionar** os segredos. ⚠️ **Atenção:** rotacionar `ENCRYPTION_KEY` torna ilegíveis todos os dados PII já criptografados — exige plano de re-criptografia, não é troca simples.

### 7. ✅ [CORRIGIDO] Ações destrutivas sem confirmação
**UX.** `TransactionsPage.tsx:486`, `GoalsPage.tsx:198`. Excluir transação/meta dispara direto no clique. O componente `alert-dialog.tsx` existe mas nunca é usado.

### 8. ✅ [CORRIGIDO] Erros de API silenciados → péssima UX no cold start (~30s) do Render
**UX.** `FinanceContext.tsx:36` faz `.catch(console.error)`. Com o backend hibernando, o usuário vê tudo **R$ 0,00** — parece perda de dados. Sem retry, sem aviso.

### 9. Webhook Telegram fica aberto se o secret não estiver setado
**Segurança.** `routes/telegram.ts:12-22` valida só `if (secret)`. Garantir `TELEGRAM_WEBHOOK_SECRET` obrigatório em produção.

---

## 🟡 Médios

| # | Achado | Agentes | Local |
|---|---|---|---|
| 10 | ✅ **[CORRIGIDO]** `db.on('error')` → `process.exit(1)`: erro de socket ocioso derruba o processo | Seg + Backend | `config/database.ts:19-22` |
| 11 | ✅ **[CORRIGIDO]** Operações multi-tabela sem transação DB (transação+history, register, reset, recorrência) | Arq + Backend | `TransactionModel`, `authService`, `TelegramBotService` |
| 12 | ✅ **[CORRIGIDO]** Migrations ambíguas: `ALL_MIGRATIONS.sql` + numeradas + dois `009_` e dois `010_` | Arq + Backend | `migrations/run.ts:18-22` |
| 13 | ✅ **[CORRIGIDO]** Contador de IA em `Map` em memória — zera no deploy, diverge em multi-instância | Arq + Backend | `aiController.ts:10` |
| 14 | ✅ **[CORRIGIDO — regime de caixa]** Saldo/resumo não distingue `paid` vs pendente — mistura realizado com previsto | Backend | `TransactionModel.getSummary` |
| 15 | ✅ **[CORRIGIDO]** Contexto da IA sem limite de tamanho nem timeout no fetch Groq | Backend | `aiController.ts:63-78` |
| 16 | ✅ **[CORRIGIDO]** Reset de senha sem validação de força (Zod ausente) | Segurança | `authController.ts:134-144` |
| 17 | ✅ **[CORRIGIDO]** Brute force no 2FA sem lockout por tentativa de TOTP | Segurança | `routes/auth.ts:11` |
| 18 | ✅ **[CORRIGIDO]** TanStack Query instalado e provido, mas NUNCA usado — estado reinventado à mão. Agora o `FinanceContext` usa `useQuery`/`useQueryClient` (cache, refetch, invalidação). | Arquitetura | `App.tsx`, `FinanceContext` |
| 19 | Zero testes e zero CI (Vitest/Playwright configurados, suíte vazia) | Arquitetura | — |
| 20 | ✅ **[CORRIGIDO — parcial]** TransactionForm: modal hand-rolled sem a11y (sem focus trap, Escape, aria). Adicionado role/aria/Escape/foco; focus trap completo pendente. | UX | `TransactionForm.tsx` |
| 21 | ✅ **[CORRIGIDO]** Toasts configurados mas ausentes no CRUD — sem feedback de sucesso | UX | `App.tsx` + páginas |
| 22 | ✅ **[CORRIGIDO]** Upload: arquivos órfãos (falha/troca/delete não limpam o antigo) | Backend | `transactionController:53-61` |
| 23 | ✅ **[CORRIGIDO]** URLs de reset/verificação logadas em texto puro em falha de e-mail | Segurança | `authService.ts:59,243` |
| 24 | Validação monetária frágil / sem máscara BRL (`type=number` rejeita vírgula) | UX | `TransactionForm.tsx:230` |
| 25 | ✅ **[CORRIGIDO]** Sem lazy loading de rotas — bundle único (Recharts, Framer, jsPDF, landing) | UX | `App.tsx` |

---

## 🟢 Baixos / dívida técnica

- ✅ **[CORRIGIDO]** Branding antigo **"Sapiens Finance"** ainda no código (`EmptyDashboard.tsx:15`).
- ✅ **[CORRIGIDO]** **`Calendar` não importado** em `MainLayout.tsx` (só não quebra porque `PeriodSelector` é dead code).
- **a11y geral fraca**: `aria-label`/`role` quase ausentes; botões só-ícone sem label.
- ✅ **[CORRIGIDO]** **`<a href>` para navegação interna** → full reload em vez de SPA (`DashboardPage:479,544`); também `window.location.href` no menu do avatar → `useNavigate`.
- **Mobile**: status de pagamento `hidden` e editar/excluir só no `group-hover` (inacessível em touch).
- **`verifyAccessToken` faz query ao banco a cada request** (+ decrypt) → carga no pool.
- **Datas relativas no parser usam timezone do servidor (UTC)** → erro de dia para usuários BRT.
- **`safeDecrypt` faz fallback silencioso para texto puro** — mascara erro de chave.
- **`any` concentrado na camada de dados** (models); bodies sem Zod em vários endpoints.
- **Sem tipos compartilhados front/back** — contrato duplicado à mão (`toFrontend`/`toBackend`).
- **Importação CSV faz N requests** (um POST por linha) — falta endpoint bulk.
- **`mock-data.ts` / `seed-data.ts`** dead code num produto em produção.

---

## ✅ Pontos fortes (consenso)

A base é **acima da média** para um SaaS financeiro:

- **SQL 100% parametrizado** — SQL dinâmico usa allowlists de colunas.
- **IDOR bem mitigado** — toda query escopa por `user_id`; admin valida `is_admin` no banco.
- **Criptografia madura** — AES-256-GCM de PII + HMAC para lookup de e-mail; bcrypt 12 rounds; 2FA TOTP.
- **Env validado com Zod no boot** (JWT ≥32 chars, ENCRYPTION_KEY 64 hex).
- **Resiliência ao cold start do Render** (porta abre antes do DB, `/health`, 503 enquanto não pronto).
- **`apiFetch` com refresh transparente + fila** evita tempestade de 401.
- **CSV com proteção contra formula-injection**; **errorHandler centralizado** sem vazar stack em prod.
- **Recorrência mensal correta** (trata overflow de meses curtos — 31/jan → 28/fev).
- **Tema sem flash**, RegisterPage com strength meter, ErrorBoundary, formatação pt-BR consistente.

---

## 🔭 Escopo fora desta avaliação

Esta auditoria foi **ampla mas não exaustiva**. Os seguintes pontos **não foram analisados a fundo** e podem conter achados adicionais — recomenda-se uma segunda rodada focada antes de considerar o sistema "auditado por completo":

**Código não lido em profundidade:**
- `backend/src/controllers/adminController.ts` e os **routes de admin** — autorização de admin é superfície de risco clássica (escalonamento de privilégio).
- `backend/src/controllers/twoFactorController.ts` — fluxo completo de ativação/desativação de 2FA, recovery codes.
- **Fluxo OAuth Google** (`routes/authGoogle.ts`) — validação de `state`, CSRF, vinculação de conta, troca de token.
- `backend/src/services/auditService.ts` e `emailService.ts` — integridade do audit log e injeção em e-mails.
- Frontend: `ReportsPage`, `GoalsPage` (completo), `AIInsightsPage`, `CSVImportModal`, `sw.js` e `manifest.json` (PWA/offline).

**Tipos de análise não realizados:**
- **Pentest dinâmico / DAST** — todos os achados vêm de leitura estática de código, não de ataque ao ambiente rodando.
- **`npm audit` / SCA de dependências** — versões vulneráveis conhecidas em `package.json` não foram verificadas contra base de CVEs.
- **Análise de infraestrutura** — configuração de Vercel, Render, Supabase (RLS do Postgres, políticas de rede, backups).
- **Teste de carga / capacidade** — limites reais do pool (max 20) e do free tier sob concorrência.
- **Conformidade LGPD formal** — registro de consentimento e portabilidade completa de dados (export hoje cobre só transações, não perfil/metas).
- **Verificação da divergência do refresh token** (ver topo) — requer leitura confirmatória do `authService.ts`.

---

## 🎯 Sequência recomendada de correção

1. **Hoje:** #2 (bug do token — features quebradas), #1 (`isPremium` server-side), #6 (segredos no OneDrive), e **verificar a divergência do refresh token**.
2. **Esta semana:** #3 (uploads autenticados), #7 + #8 (confirmação de delete + erro no cold start), #4 + #5 (paginação real + busca escalável).
3. **Fundação:** #19 (CI + testes nos pontos sensíveis) **antes** de refatorar #18 (TanStack Query), #11 (transações DB), #12 (migrations), #13 (contador IA persistido).

---

**Placar:** 🔴 ~9 críticos/altos · 🟡 16 médios · 🟢 12 dívida técnica.

  --📌 Onde paramos

  Concluído e no GitHub (branch fix/auditoria-bloco-rapidas, commits 309c574 · c4a1536 · 0845fcf · +Bloco 6):
  - Blocos 1–5: segurança rápida, UX, regime de caixa (#14), frontend (lazy + a11y), e backend hardening (#3, #22, #17).
  - Bloco 6: #11 (transações DB atômicas), #12 (migrations desambiguadas), #13 (contador de IA persistido).
  - ✅ Migration 014 aplicada no Supabase → lockout de 2FA ativo após o deploy do backend.
  - ⏳ Migration 015 (`ai_usage`) criada — **falta aplicar no Supabase** antes do deploy.

  - Bloco 7: #5 (busca escalável — teto de varredura no `findAll`).
  - Bloco 8: #4 + #18 (Híbrido completo — Etapa A: TanStack Query + histórico completo; Etapa B: agregados server-side em Dashboard/Reports + paginação real na lista).

  Pendências (código puro):
  - #19 (testes + CI).

  Continuam sendo sua parte:
  - 🔴 Refresh token em texto puro + sem rotação (exige schema/produção).
  - 🔐 Segredos no OneDrive sincronizado (mover + rotacionar — cuidado com ENCRYPTION_KEY).
  - Anexos em disco efêmero → storage externo.

  Lembrete de deploy: ao subir o backend, a migration já está aplicada, então /login/2fa funcionará normalmente.
