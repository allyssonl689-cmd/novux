# Novux Finance — Roadmap para Produto Comercial

## Visão Geral

Novux Finance é uma plataforma SaaS de gestão financeira pessoal com IA integrada (Groq LLaMA 3.3), bot Telegram, metas, relatórios, dashboard premium e conformidade LGPD. Este documento define o checklist completo para transformar o projeto em um produto vendável.

---

## Status do Deploy (atualizado em 2026-05-30)

| Serviço | URL | Status |
|---|---|---|
| Frontend | https://novux-export.vercel.app | ✅ No ar |
| Backend | https://novux.onrender.com | ✅ No ar |
| Banco de dados | Supabase (PostgreSQL) | ✅ Conectado |
| Bot Telegram | @Novuxx_bot | ✅ Operacional |
| Repositório | https://github.com/allyssonl689-cmd/novux | ✅ Público |

---

## Checklist Geral — Produto SaaS Vendável

### ✅ Produto — Implementado

- [x] Dashboard com KPIs em tempo real (Saldo, Receitas, Despesas, Patrimônio)
- [x] Lançamentos com categorias, tags, notas, comprovante, recorrência mensal
- [x] Importação CSV
- [x] Exportação CSV e JSON
- [x] Metas financeiras com progresso
- [x] Relatórios (fluxo de caixa, breakdown por categoria)
- [x] Investimentos (página)
- [x] IA Copilot (chat com LLaMA 3.3 70B via Groq)
- [x] Score financeiro 0-1000
- [x] Insights automáticos
- [x] Bot Telegram (@Novuxx_bot) — lançamentos por mensagem natural
- [x] Autenticação JWT (access + refresh tokens com hash)
- [x] 2FA (TOTP)
- [x] Google OAuth (rota preparada)
- [x] PWA (manifest, service worker, ícones SVG)
- [x] Dark/Light mode
- [x] Multi-moeda (BRL, USD, EUR, GBP)
- [x] Responsividade mobile
- [x] Design system Novux (brand book, tokens CSS)
- [x] Página de Configurações (moeda, orçamento, notificações, exportação)
- [x] Página de Ajuda / FAQ
- [x] Landing page pública (/landing)
- [x] Onboarding modal (primeiro acesso)
- [x] Dashboard Admin (/admin)
- [x] Programa de Indicação (estrutura — código + rastreio)
- [x] Padronização de fontes (Poppins em todas as páginas)
- [x] Header contextual (sem seletor de mês em Perfil/Configurações/Admin)
- [x] Política de Privacidade (/privacidade) e Termos de Uso (/termos)
- [x] Consentimento LGPD no cadastro (checkbox obrigatório)
- [x] Categorias expandidas (22 categorias de despesa + 6 de receita)
- [x] E-mail de boas-vindas após cadastro (Brevo)
- [x] E-mail de confirmação de cadastro com link de 24h
- [x] Verificação de e-mail: página /verify-email + banner no app
- [x] Gate de IA baseado em plano real (user.plan === 'premium')
- [x] Relatório PDF funcional (já implementado no ReportsPage)
- [x] Informações do controlador LGPD na Política de Privacidade

### ✅ Segurança — Implementado

- [x] Senhas com bcrypt (12 rounds)
- [x] JWT access (15min) + refresh token (7d) com hash SHA-256 no banco
- [x] Refresh token em cookie HttpOnly/Secure/SameSite=Strict (access token apenas em memória)
- [x] Rate limiting global e específico para login
- [x] Rate limiting por usuário nas rotas de dados (transactions, goals, reports)
- [x] Brute force protection (bloqueio após 5 tentativas por 15min)
- [x] Helmet (headers HTTP de segurança)
- [x] CORS configurado
- [x] Validação de inputs com Zod
- [x] Content Security Policy (CSP) via Vercel headers — unsafe-eval removido
- [x] X-Frame-Options DENY
- [x] Webhook Telegram com secret token
- [x] Audit log de ações sensíveis (login, logout, export, delete, password_change)
- [x] 2FA (TOTP) disponível
- [x] pending_2fa persistido no banco (não mais em Map em memória)
- [x] SSL do banco com rejectUnauthorized: true em produção
- [x] Rota POST /api/auth/change-password (com invalidação de sessões)
- [x] Logout automático por inatividade (30 min sem interação)
- [x] Logs estruturados em JSON (logger próprio)
- [x] GOOGLE_CLIENT_ID validado via Zod no env.ts

### ✅ LGPD / Compliance — Implementado

- [x] Consentimento explícito no cadastro (checkbox obrigatório)
- [x] Política de Privacidade (/privacidade)
- [x] Termos de Uso (/termos)
- [x] Portabilidade de dados (export CSV/JSON)
- [x] Exclusão completa de conta (DELETE /api/auth/account com cascade)
- [x] Audit log de acessos (art. 37 LGPD)
- [x] Dados financeiros não vendidos a terceiros

---

### 🔄 Em Progresso / Próximas Prioridades

#### Segurança — Pendentes
- [x] **Email verification no cadastro** — ✅ implementado com Brevo
- [ ] **CAPTCHA no login/registro** — Cloudflare Turnstile (gratuito, sem domínio)
- [ ] **Logs centralizados** — Datadog, Loki ou CloudWatch
- [ ] **Alertas de comportamento anômalo** — Sentry
- [ ] **WAF** — Cloudflare (gratuito no plano free)
- [ ] **Scan de dependências no CI** — GitHub Actions + npm audit
- [ ] **CSP com nonces** — remoção do unsafe-inline
- [ ] **Bloqueio por IP** — requer Redis distribuído

#### Billing / Monetização (alta prioridade)
- [ ] Sistema de pagamentos (Stripe ou Mercado Pago)
- [ ] Gates Free vs Premium funcionais (hoje hardcoded)
- [ ] Coluna `plan` nos usuarios ativada (migrations prontas, gates pendentes)
- [ ] Página de checkout e gestão de assinatura
- [ ] Webhook de pagamento para ativar/desativar plano
- [ ] Emissão de nota fiscal (CNPJ necessário)

#### Comunicação
- [x] Provedor de e-mail: Brevo HTTP API (sem SMTP, sem bloqueio de cloud)
- [x] E-mail de boas-vindas após cadastro
- [x] E-mail de confirmação de cadastro
- [x] E-mail de reset de senha
- [ ] Notificação de pagamento e renovação (depende de billing)

#### Produto (média prioridade)
- [ ] App mobile nativo (React Native ou Flutter)
- [ ] Push notifications (Firebase FCM)
- [ ] Widget de saldo (mobile)
- [ ] Open Banking — importação automática de extratos (Pluggy/Belvo)
- [ ] Relatórios em PDF
- [ ] Carteiras (múltiplas contas bancárias)
- [ ] Integração com corretoras (investimentos)
- [ ] Recompensas do programa de indicação (depende de billing)

#### Operacional (média prioridade)
- [ ] Domínio personalizado (novux.com.br ou similar)
- [ ] Uptime monitoring (UptimeRobot ou Better Uptime)
- [ ] Backup automático configurado no Supabase
- [ ] Monitoramento de erros (Sentry)
- [ ] Analytics de produto (Mixpanel ou Posthog)
- [ ] Suporte ao cliente (Crisp ou similar)

#### Legal (alta prioridade)
- [ ] CNPJ (para cobrar legalmente)
- [ ] Contrato de DPO (responsável LGPD)
- [ ] Informações do controlador visíveis no app (nome/contato)

---

## Identidade Visual — Arquivos para Substituição

| Arquivo | Uso | Tamanho recomendado |
|---|---|---|
| [public/icon.svg](public/icon.svg) | Ícone vetorial base (N lettermark) | SVG escalável |
| [public/icon-192.png](public/icon-192.png) | Ícone PWA (Android/Chrome) | 192×192 px |
| [public/icon-512.png](public/icon-512.png) | Ícone PWA splash screen | 512×512 px |
| [public/favicon.svg](public/favicon.svg) | Favicon SVG (tab do browser) | SVG escalável |

---

## Arquitetura Atual

```
Frontend  → Vercel (React 18 + TypeScript + Vite)
Backend   → Render (Node.js + Express + TypeScript)
Banco     → Supabase (PostgreSQL + Session Pooler IPv4)
IA        → Groq API (LLaMA 3.3 70B)
Bot       → Telegram Bot API (@Novuxx_bot)
Auth      → JWT (15min access + 7d refresh com hash SHA-256)
```

---
