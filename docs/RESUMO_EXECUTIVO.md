# NOVUX FINANCE — O QUE FALTA

## Status atual

| Camada | Status |
|--------|--------|
| Design / Frontend | ✅ Completo |
| Backend API (Node.js + Express + PostgreSQL) | ✅ Completo |
| Autenticação JWT | ✅ Completo |
| APIs CRUD (transações, categorias, metas, relatórios) | ✅ Completo |
| Frontend conectado ao backend | ❌ Pendente |
| Integração bancária (Pluggy) | ❌ Pendente | deixar em standby por enquanto
| Mobile / PWA | ❌ Pendente |

---

## ETAPAS RESTANTES

### Semanas 3–4 — Conectar Frontend ao Backend

- [ ] Instalar e configurar cliente HTTP no frontend (`axios` ou `fetch` com interceptors)
- [ ] Criar camada de serviços em `src/services/` (authService, transactionService, etc.)
- [ ] Substituir todas as leituras/escritas de `localStorage` por chamadas à API
- [ ] Implementar fluxo de autenticação: tela de login, registro, refresh automático do token, logout
- [ ] Atualizar `FinanceContext.tsx` para buscar dados da API em vez de localStorage
- [ ] Testes de segurança básicos (OWASP Top 10)

---

### Semanas 5–6 — Integração Bancária (Pluggy)

- [ ] Criar conta e configurar SDK do Pluggy
- [ ] Endpoint `POST /api/banking/connect` — iniciar conexão com banco
- [ ] Webhook `POST /api/banking/webhook` — receber transações em tempo real
- [ ] Sincronização e deduplicação de transações importadas
- [ ] Categorização automática das transações recebidas

---

### Semanas 7–8 — Multi-banco e Backup

- [ ] Suporte a múltiplas contas bancárias por usuário
- [ ] Dashboard de status de sincronização no frontend
- [ ] Backup automático do banco PostgreSQL (pg_dump agendado)

---

### Semanas 9–10 — PWA e Notificações

- [ ] Configurar PWA (manifest, service worker, offline mode)
- [ ] Notificações push (alertas de gastos, vencimentos)

---

### Semanas 11–12 — QA e Lançamento

- [ ] Testes automatizados (backend: Jest/Supertest, frontend: Vitest + Playwright)
- [ ] Documentação da API (Swagger/OpenAPI)
- [ ] Deploy em produção (DigitalOcean ou AWS)
- [ ] Configurar monitoramento (Sentry para erros, logs estruturados)

---

## Próximo passo imediato

**Conectar o frontend ao backend** — criar `src/services/api.ts` no frontend com o cliente HTTP base e atualizar o `FinanceContext.tsx`.
