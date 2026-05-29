# Novux Finance

**Seu copiloto financeiro inteligente.**

Plataforma SaaS de gestão financeira pessoal com IA real (Groq LLaMA 3.3 70B), bot Telegram, análise de gastos, metas, investimentos e insights automáticos. Interface dark/light mode premium, design system próprio (brand book), conformidade LGPD e arquitetura pronta para escala.

> **Última atualização:** 30 de maio de 2026 — v1.2.0

---

## Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Design System](#design-system)
- [API — Endpoints](#api--endpoints)
- [Banco de Dados](#banco-de-dados)
- [Autenticação e Segurança](#autenticação-e-segurança)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Rodando Localmente](#rodando-localmente)
- [Deploy](#deploy)
- [App Mobile — Guia de Integração](#app-mobile--guia-de-integração)
- [Roadmap](#roadmap)
- [Documentação Adicional](#documentação-adicional)

---

## Visão Geral

| Item | Valor |
|---|---|
| Produto | Novux Finance |
| Versão | 1.2.0 |
| Frontend (Web) | https://novux-export.vercel.app |
| Landing Page | https://novux-export.vercel.app/landing |
| Bot Telegram | [@Novuxx_bot](https://t.me/Novuxx_bot) |
| Backend (API) | https://novux.onrender.com |
| Repositório | https://github.com/allyssonl689-cmd/novux |

---

## Stack Tecnológica

### Frontend (Web)
| Tecnologia | Versão | Papel |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Tipagem estática |
| Vite | 8 | Build tool |
| Tailwind CSS | 3 | Estilização |
| Framer Motion | — | Animações |
| Recharts | — | Gráficos financeiros |
| React Router v6 | — | Navegação |
| TanStack Query | — | Cache/estado servidor |
| shadcn/ui | — | Componentes base (Radix) |
| Lucide React | — | Ícones (stroke 1.75, outline) |

### Backend (API)
| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4 | Framework HTTP |
| TypeScript | 5 | Tipagem |
| PostgreSQL | 14+ | Banco de dados |
| Supabase | — | Hospedagem do banco (Session Pooler) |
| JWT | — | Access token (15min) + Refresh token (7d) |
| bcrypt | — | Hash de senhas (12 rounds) |
| Zod | — | Validação de env e inputs |
| Groq SDK | — | IA: LLaMA 3.3 70B |
| Helmet + CORS | — | Segurança HTTP |
| Multer | — | Upload de comprovantes |

### Infraestrutura
| Serviço | Uso |
|---|---|
| Vercel | Frontend (Vite SPA) |
| Render | Backend (free tier, spin-up ~30s) |
| Supabase | PostgreSQL + Session Pooler (IPv4) |
| GitHub | Repositório + CI/CD automático |

---

## Estrutura do Projeto

```
novux/
├── src/                        # Frontend React
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx  # Sidebar com N lettermark + nav
│   │   │   └── MainLayout.tsx  # Header, período, notificações
│   │   ├── ui/                 # shadcn/ui (Button, Card, Dialog…)
│   │   ├── TransactionForm.tsx # Modal de criação/edição
│   │   └── CSVImportModal.tsx  # Importação em lote
│   ├── contexts/
│   │   ├── AuthContext.tsx     # JWT, login, refresh automático
│   │   ├── FinanceContext.tsx  # Transações, metas, insights
│   │   ├── PeriodContext.tsx   # Filtro de período global
│   │   └── ThemeContext.tsx    # Dark/Light mode
│   ├── lib/
│   │   ├── tokens.ts           # Design system: COLORS, CHART, GRADIENTS, MOTION
│   │   ├── types.ts            # Tipos globais: Transaction, Goal, Category…
│   │   ├── financial-indicators.ts # Score financeiro, risco
│   │   └── insights.ts         # Geração automática de insights
│   ├── pages/
│   │   ├── DashboardPage.tsx   # KPIs, gráficos, insights IA
│   │   ├── TransactionsPage.tsx # Lançamentos com filtro e paginação
│   │   ├── GoalsPage.tsx       # Metas financeiras
│   │   ├── InvestmentsPage.tsx # Carteira de investimentos
│   │   ├── AIInsightsPage.tsx  # Chat IA + Score financeiro
│   │   ├── ReportsPage.tsx     # Relatórios detalhados
│   │   ├── ProfilePage.tsx     # Perfil, tema, configurações
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── services/
│   │   ├── api.ts              # apiFetch com interceptor JWT
│   │   ├── transactionService.ts
│   │   ├── authService.ts
│   │   ├── goalService.ts
│   │   └── reportsService.ts
│   └── index.css               # CSS vars brand book + tokens Novux
│
├── backend/                    # API Node.js + Express
│   └── src/
│       ├── app.ts              # Entry point, rotas, middleware
│       ├── config/
│       │   ├── database.ts     # Pool PostgreSQL (ssl prod)
│       │   └── env.ts          # Variáveis validadas com Zod
│       ├── controllers/        # Lógica de negócio por domínio
│       ├── models/             # Queries SQL diretas (sem ORM)
│       ├── routes/             # Definição de rotas Express
│       ├── middleware/         # Auth JWT, rate limiter, upload, erros
│       ├── services/           # authService (tokens JWT)
│       ├── validators/         # Validação de inputs (Zod)
│       └── migrations/         # SQL de criação das tabelas
│
├── public/                     # Assets estáticos PWA
│   ├── favicon.svg             # N lettermark cyan→roxo
│   ├── icon.svg                # Ícone PWA 512px
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker (cache offline)
│
├── docs/                       # Documentação técnica
│   ├── PROJETO.md              # Visão técnica completa
│   ├── ROADMAP_PRODUTO.md      # Roadmap e status de deploy
│   ├── ANALISE_COMPLETA.md     # Análise de arquitetura
│   ├── OPEN_BANKING_GUIA.md    # Guia Open Banking
│   └── RESUMO_EXECUTIVO.md     # Resumo para stakeholders
│
├── index.html                  # Entry HTML com fontes Google
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Funcionalidades

### Módulo Financeiro
- **Dashboard** — KPIs em tempo real: Saldo, Receitas, Despesas, Patrimônio Líquido + dot animado
- **Lançamentos** — CRUD completo com 28 categorias, tags, notas, comprovante, recorrência mensal
- **Recorrência** — Transações mensais repetidas automaticamente (N meses) com cálculo seguro de data (sem overflow de meses curtos)
- **Status de pagamento** — Marcar como "pago/recebido" ou "em aberto"
- **Importação CSV** — Upload e mapeamento de planilhas bancárias
- **Filtro de período** — Mês atual, trimestre, semestre, ano, período personalizado
- **Configurações** — Moeda padrão, limite de orçamento por categoria, notificações, exportação

### IA Copilot (Groq LLaMA 3.3 70B)
- Chat financeiro com contexto completo do usuário (receitas, despesas, histórico)
- Análise automática de gastos, projeções e recomendações
- Score financeiro 0–1000 com breakdown por dimensão
- Limite diário por plano (Free: 5 msgs/dia; Pro: ilimitado)

### Metas
- Criação de metas com valor-alvo e prazo
- Progresso visual com barra e percentual
- Marcação de meta como concluída

### Relatórios
- Fluxo de caixa mensal (bar/area chart)
- Breakdown por categoria (pie chart + barra)
- Exportação CSV

### Autenticação e Segurança
- Registro/login com email + senha (validação de força de senha)
- Google OAuth (rota preparada)
- JWT access token (15min) + refresh token (7 dias, hash SHA-256 no banco)
- 2FA (TOTP) — Google Authenticator / Authy
- Brute force protection — bloqueio após 5 tentativas por 15min
- Audit log de ações sensíveis (login, logout, export, delete)
- CSP, X-Frame-Options, Referrer-Policy via Vercel headers

### LGPD / Compliance
- Consentimento explícito no cadastro
- Política de Privacidade (`/privacidade`)
- Termos de Uso (`/termos`)
- Exportação de dados (CSV/JSON)
- Exclusão completa de conta (`DELETE /api/auth/account`)

### Páginas Públicas
- Landing page (`/landing`) — Hero, Features, Planos, FAQ, Footer
- Central de Ajuda (`/ajuda`) — 20+ perguntas em 6 categorias
- Política de Privacidade (`/privacidade`)
- Termos de Uso (`/termos`)

### Admin
- Dashboard Admin (`/admin`) — métricas de usuários, planos, crescimento, top categorias

### PWA
- Instalável como app (manifest + service worker)
- Cache offline das assets
- Ícones SVG para Android/iOS

---

## Design System

Baseado no **Novux Brand Book** (2026). Tokens em `src/lib/tokens.ts`.

### Paleta Principal
| Token | Hex | Uso |
|---|---|---|
| `primary` | `#16C7FF` | Botões, links, destaques |
| `background` | `#050816` | Fundo da aplicação |
| `card` | `#121933` | Cards e painéis |
| `success` | `#19D38A` | Receitas, metas cumpridas |
| `danger` | `#FF5A5F` | Despesas, alertas críticos |
| `accent` | `#8B5CF6` | IA, roxo insight |
| `warning` | `#F59E0B` | Atenção, avisos |

### Tipografia
| Fonte | Uso |
|---|---|
| **Poppins** | Corpo, UI, botões (fonte primária da marca) |
| **Inter** | Fallback universal |
| **Outfit** | KPIs e valores monetários grandes |
| **Fira Code** | Valores monetários inline (`.mono`) |

### Gradientes
```css
/* Primary — botões e destaques */
linear-gradient(135deg, #16C7FF, #8B5CF6)

/* IA Copilot */
linear-gradient(135deg, #16C7FF, #8B5CF6 60%, #FF5A5F)

/* Success */
linear-gradient(135deg, #19D38A, #16C7FF)
```

### Classes Utilitárias CSS
```css
.btn-novux        /* Botão primário com gradiente cyan */
.btn-ia           /* Botão com gradiente IA cyan→roxo */
.glass            /* Glassmorphism: blur(16px) + borda sutil */
.card-hover       /* Card com efeito lift no hover */
.card-glow-primary/* Borda + glow cyan */
.shadow-glow-primary /* Box shadow glow */
.text-gradient    /* Texto cyan→roxo */
.skeleton         /* Skeleton loading animado */
.badge-cyan / .badge-violet / .badge-green / .badge-red
```

---

## API — Endpoints

Base URL: `https://novux.onrender.com`

> Todos os endpoints protegidos exigem header `Authorization: Bearer <access_token>`

### Auth — `/api/auth`
| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| POST | `/register` | `{ name, email, password }` | Cadastro |
| POST | `/login` | `{ email, password }` | Login → `{ accessToken, refreshToken, user }` |
| POST | `/refresh` | `{ refreshToken }` | Renova access token |
| POST | `/logout` | `{ refreshToken }` | Revoga refresh token |

### Transações — `/api/transactions` 🔒
| Método | Rota | Parâmetros | Descrição |
|---|---|---|---|
| GET | `/` | `?type&category&startDate&endDate&search&tags&page&limit` | Lista paginada |
| POST | `/` | body Transaction | Criar transação |
| PUT | `/:id` | body parcial | Editar transação |
| DELETE | `/:id` | — | Excluir transação |
| POST | `/:id/attachment` | `multipart/form-data` (field: `file`) | Upload comprovante |
| GET | `/:id/history` | — | Histórico de alterações |
| GET | `/export/csv` | `?startDate&endDate` | Exportar CSV |

**Modelo Transaction:**
```json
{
  "type": "income | expense",
  "value": 1500.00,
  "category": "Salário",
  "date": "2026-05-01",
  "description": "Salário maio",
  "notes": "Opcional",
  "recurrence": "none | daily | weekly | monthly | yearly",
  "recurrence_months": 12,
  "is_recurring": false,
  "paid": true,
  "tags": ["fixo", "trabalho"],
  "currency": "BRL"
}
```

### Categorias — `/api/categories` 🔒
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista categorias do usuário |
| POST | `/` | Criar categoria personalizada |
| DELETE | `/:id` | Excluir (somente não-padrão) |

### Metas — `/api/goals` 🔒
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista metas |
| POST | `/` | Criar meta |
| PUT | `/:id` | Atualizar progresso/meta |
| DELETE | `/:id` | Excluir meta |

### Relatórios — `/api/reports` 🔒
| Método | Rota | Parâmetros | Descrição |
|---|---|---|---|
| GET | `/summary` | `?startDate&endDate` | Resumo receita/despesa/saldo |
| GET | `/monthly` | `?year` | Resumo por mês do ano |
| GET | `/categories` | `?startDate&endDate` | Breakdown por categoria |
| GET | `/cashflow` | `?months=6` | Fluxo de caixa N meses |

### IA — `/api/ai` 🔒
| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| POST | `/chat` | `{ message, context, isPremium }` | Chat com LLaMA via Groq |
| GET | `/usage` | — | Quota de mensagens do dia (free) |

### Usuário — `/api/users` 🔒
| Método | Rota | Descrição |
|---|---|---|
| GET | `/me` | Perfil do usuário autenticado |
| PUT | `/me` | Atualizar nome/email/senha |
| DELETE | `/me` | Excluir conta |

---

## Banco de Dados

PostgreSQL hospedado no **Supabase** (Session Pooler para IPv4).

### Tabelas Principais

```sql
users               -- id, name, email, password_hash, plan, created_at
refresh_tokens      -- id, user_id, token_hash, expires_at, revoked
categories          -- id, user_id, name, is_default
transactions        -- id, user_id, type, value, category, date, description,
                    --   notes, recurrence, recurrence_months, is_recurring,
                    --   paid, tags[], currency, attachment_url
goals               -- id, user_id, title, target_value, current_value,
                    --   deadline, color, emoji, completed
transaction_history -- id, transaction_id, user_id, action, snapshot (jsonb)
```

Scripts de migração: `backend/src/migrations/ALL_MIGRATIONS.sql`

---

## Autenticação e Segurança

- **JWT duplo:** access token (15min) + refresh token (7 dias)
- **Auto-refresh:** o frontend renova o access token silenciosamente via interceptor em `src/services/api.ts`
- **Bcrypt:** 12 rounds no hash de senhas
- **Rate limiting:** 100 req/15min (global), 10 req/15min (login)
- **Helmet:** headers de segurança HTTP
- **CORS:** origin configurável via `CORS_ORIGIN`
- **Armazenamento:** tokens no `localStorage` (migração para httpOnly cookies está no roadmap)

---

## Variáveis de Ambiente

### Frontend (`/.env`)
```env
VITE_API_URL=https://novux.onrender.com
```

### Backend (`/backend/.env`)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://USER:PASS@aws-1-us-west-2.pooler.supabase.com:5432/postgres
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://novux-export.vercel.app
GROQ_API_KEY=<opcional — habilita IA Copilot>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## Rodando Localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+ (ou conta Supabase)
- (Opcional) Conta Groq para IA

### Frontend
```bash
npm install
cp .env.example .env        # Ajuste VITE_API_URL
npm run dev                  # http://localhost:5173
```

### Backend
```bash
cd backend
npm install
cp .env.example .env         # Preencha DATABASE_URL, JWT_SECRET, etc.
# Criar tabelas (uma vez):
psql $DATABASE_URL -f src/migrations/ALL_MIGRATIONS.sql
npm run dev                  # http://localhost:3001
```

---

## Deploy

| Plataforma | Configuração |
|---|---|
| **Vercel** (frontend) | Framework: Vite · Root: `/` · `vercel.json` com SPA rewrite |
| **Render** (backend) | Root: `backend/` · Build: `npm install --include=dev && npm run build` · Start: `node --dns-result-order=ipv4first dist/app.js` |
| **Supabase** | Session Pooler (porta 5432, IPv4) — necessário no Render |

---

## App Mobile — Guia de Integração

Esta seção descreve como criar o app mobile (React Native / Flutter) consumindo a mesma API.

### Autenticação

```
POST /api/auth/login
→ { accessToken, refreshToken, user }

Armazene:
  accessToken   → memória / SecureStore (expira 15min)
  refreshToken  → SecureStore persistente (expira 7d)

Renove automaticamente:
POST /api/auth/refresh
Body: { refreshToken }
→ { accessToken }
```

Toda requisição protegida deve incluir:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Fluxo de Dados Recomendado (Mobile)

```
1. Login → salvar tokens no SecureStore
2. Carregar transações do mês atual:
   GET /api/transactions?startDate=2026-05-01&endDate=2026-05-31&limit=100
3. Carregar resumo:
   GET /api/reports/summary?startDate=2026-05-01&endDate=2026-05-31
4. Metas:
   GET /api/goals
5. IA Chat:
   POST /api/ai/chat
```

### Telas e Mapeamento de API

| Tela Mobile | Endpoints |
|---|---|
| Home / Dashboard | `GET /reports/summary`, `GET /transactions?limit=5` |
| Transações | `GET /transactions` (paginado), `POST /transactions`, `PUT /:id`, `DELETE /:id` |
| Nova Transação | `POST /transactions`, `GET /categories` |
| Metas | `GET /goals`, `POST /goals`, `PUT /goals/:id` |
| IA Copilot | `POST /ai/chat`, `GET /ai/usage` |
| Relatórios | `GET /reports/monthly`, `GET /reports/categories`, `GET /reports/cashflow` |
| Perfil | `GET /users/me`, `PUT /users/me` |

### Design System Mobile

Use os mesmos tokens de cor do brand book:

```
Background:   #050816
Surface:      #0B1020
Card:         #121933
Primary:      #16C7FF
Success:      #19D38A
Danger:       #FF5A5F
Accent:       #8B5CF6
Warning:      #F59E0B
Text primary: #F8FAFC
Text muted:   #64748B
```

Fontes recomendadas para mobile:
- **Poppins** (Google Fonts) — corpo e UI
- **Outfit** (Google Fonts) — valores KPI

### Considerações de Performance (Mobile)

- Implemente **paginação** (`page` + `limit`) na listagem de transações
- Use **cache local** (AsyncStorage / Hive) para os dados do período atual
- O backend no Render tem **cold start de ~30s** no free tier — considere upgrade para produção ou implemente loading state generoso
- Upload de comprovantes: `POST /:id/attachment` com `multipart/form-data`, campo `file`

### Recursos Pendentes para Mobile

| Feature | Status | Notas |
|---|---|---|
| Push Notifications | Não implementado | Integrar Firebase FCM |
| Biometria / Face ID | Não implementado | Usar SecureStore + biometria nativa |
| Widget de saldo | Não implementado | Requer app nativo |
| Open Banking | Roadmap | Ver `docs/OPEN_BANKING_GUIA.md` |
| Plano Free/Pro gate | Roadmap | Coluna `plan` no banco já prevista |

---

## Roadmap

Ver [docs/ROADMAP_PRODUTO.md](docs/ROADMAP_PRODUTO.md) para o roadmap completo.

**Próximas prioridades:**
- [ ] Tokens JWT migrados para httpOnly cookies
- [ ] Gate Free vs Pro (coluna `plan` + Stripe/Mercado Pago)
- [ ] Email transacional (reset de senha, boas-vindas)
- [ ] App mobile (React Native / Flutter)
- [ ] Push notifications
- [ ] Open Banking (Pluggy / Belvo)
- [ ] Domínio personalizado

---

## Documentação Adicional

| Arquivo | Conteúdo |
|---|---|
| [docs/PROJETO.md](docs/PROJETO.md) | Visão técnica completa e decisões de arquitetura |
| [docs/ROADMAP_PRODUTO.md](docs/ROADMAP_PRODUTO.md) | Roadmap de produto e status de deploy |
| [docs/ANALISE_COMPLETA.md](docs/ANALISE_COMPLETA.md) | Análise de arquitetura e melhorias |
| [docs/OPEN_BANKING_GUIA.md](docs/OPEN_BANKING_GUIA.md) | Guia de integração Open Banking |
| [docs/RESUMO_EXECUTIVO.md](docs/RESUMO_EXECUTIVO.md) | Resumo para stakeholders |

---

**Novux Finance** — Transformando informação financeira em evolução.
