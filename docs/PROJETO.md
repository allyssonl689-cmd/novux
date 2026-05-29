# Novux Finance — Documentação Técnica do Projeto

## Visão Geral

App de finanças pessoais full-stack com dashboard interativo, IA integrada (chat + insights), metas, investimentos, relatórios PDF e sistema de autenticação completo com 2FA.

**Stack:** React 18 + TypeScript + Vite (frontend) | Node.js + Express + PostgreSQL (backend)

---

## Estrutura do Projeto

```
novux-export/
├── src/                        # Frontend React
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx  # Layout principal: header, sidebar, notificações
│   │   │   └── AppSidebar.tsx  # Sidebar de navegação
│   │   ├── ui/                 # Componentes shadcn/ui
│   │   ├── TransactionForm.tsx # Form de nova/edição de transação
│   │   └── auth/
│   │       └── GoogleButton.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Autenticação, JWT, 2FA
│   │   ├── FinanceContext.tsx   # Transações, insights, metas, investimentos
│   │   ├── finance-context.ts  # Tipos e interfaces do contexto financeiro
│   │   ├── ThemeContext.tsx     # Dark/light mode
│   │   └── PeriodContext.tsx    # Filtro de período global (mês, trimestre, etc.)
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Dashboard com KPIs e gráficos
│   │   ├── TransactionsPage.tsx # Lista de transações com filtros e tags
│   │   ├── GoalsPage.tsx       # Metas financeiras (criar/editar/excluir)
│   │   ├── InvestmentsPage.tsx # Carteira de investimentos
│   │   ├── ReportsPage.tsx     # Relatórios com exportação PDF/CSV
│   │   ├── AIInsightsPage.tsx  # Chat com IA (NovuxAI via Groq)
│   │   ├── ProfilePage.tsx     # Perfil, 2FA, multi-moeda
│   │   ├── LoginPage.tsx       # Login com animação + tela 2FA
│   │   └── RegisterPage.tsx    # Cadastro com validação de senha forte
│   ├── services/
│   │   ├── authService.ts      # Chamadas à API de auth
│   │   └── transactionService.ts
│   └── lib/
│       ├── types.ts            # Tipos globais do frontend
│       └── utils/
│           └── generatePDF.ts  # Geração de PDF com jsPDF
│
├── backend/
│   └── src/
│       ├── app.ts              # Express app, middlewares, rotas
│       ├── config/
│       │   ├── env.ts          # Validação de env vars com Zod
│       │   ├── database.ts     # Pool de conexões PostgreSQL
│       │   └── auth.ts         # Config JWT
│       ├── controllers/        # Handlers de rotas
│       ├── services/
│       │   └── authService.ts  # Lógica de login, 2FA, tokens
│       ├── models/             # Queries ao banco de dados
│       ├── middleware/
│       │   ├── authMiddleware.ts  # Verificação JWT
│       │   ├── rateLimiter.ts    # Rate limiting por IP
│       │   ├── errorHandler.ts   # Handler global de erros
│       │   └── upload.ts         # Upload de arquivos (multer)
│       ├── validators/         # Schemas Zod para inputs
│       ├── routes/             # Definição das rotas
│       └── migrations/         # SQLs de migração do banco
│
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png            # Ícone PWA 192x192
│   └── icon-512.png            # Ícone PWA 512x512
│
├── ROADMAP_PRODUTO.md          # Plano comercial, deploy, monetização
└── PROJETO.md                  # Este arquivo
```

---

## Funcionalidades Implementadas

### Autenticação e Segurança
- Registro com validação de senha forte (maiúscula, minúscula, número, especial, 8+ chars)
- Login com JWT (access 15min + refresh 7d)
- Login com Google OAuth (rota preparada em `backend/src/routes/authGoogle.ts`)
- 2FA via TOTP (Google Authenticator / Authy) — ativar em Perfil
- Rate limiting: 100 req/15min por IP
- Bcrypt rounds 12 para hashes de senha
- Helmet para headers de segurança HTTP

### Dashboard
- KPIs: receitas, despesas, saldo, taxa de poupança
- Gráficos de barras (receita vs despesa) e linhas (tendência 6 meses)
- Gráfico de pizza por categoria
- Filtro de período global (mês atual, trimestre, semestre, ano, personalizado)
- Insights automáticos gerados por regras financeiras

### Transações
- CRUD completo de transações (receita/despesa)
- Tags personalizadas com exibição inline (chips `#tag`)
- Anexos (upload de arquivo por transação)
- Histórico de edições auditável
- Filtros: tipo, categoria, período, busca por descrição
- Importação via CSV

### Metas Financeiras
- Criar/editar/excluir metas com valor alvo e progresso atual
- Barra de progresso visual
- Cálculo automático de % alcançada

### Investimentos
- Cadastro de ativos com tipo, valor, rentabilidade
- Simulação de crescimento projetado
- Resumo de carteira (total investido, retorno estimado)

### Relatórios
- Exportação PDF com 3 páginas: KPIs, gráficos de categoria, insights IA
- Dicas personalizadas geradas com base nos dados do usuário
- Exportação CSV das transações
- Importação CSV com mapeamento de colunas

### IA — NovuxAI
- Chat em linguagem natural sobre finanças
- Contexto financeiro do usuário enviado a cada mensagem
- Backend via Groq API (LLaMA 3.3 70B) — gratuito
- Limite: 5 mensagens/dia no plano Free, ilimitado no Pro
- Configurar `GROQ_API_KEY` em `backend/.env`

### Perfil
- Edição de nome e email
- Ativar/desativar 2FA com QR Code
- Configuração de moeda principal e moedas secundárias
- Toggle de modo escuro/claro

### PWA
- `manifest.json` configurado para instalação
- Ícones 192px e 512px gerados
- Service Worker (via Vite PWA plugin)

### Notificações
- Painel de notificações no header com insights financeiros
- Dismiss individual e "Limpar tudo"
- Badge vermelho apenas quando há alertas críticos/warning não lidos

---

## Rotas da API

### Auth (`/api/auth`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/register` | Cadastro de usuário |
| POST | `/login` | Login (retorna tokens ou `requires2FA`) |
| POST | `/login/2fa` | Verificação do código TOTP |
| POST | `/refresh` | Renovar access token |
| POST | `/logout` | Invalidar refresh token |

### Usuários (`/api/users`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/me` | Dados do usuário autenticado |
| PATCH | `/me` | Atualizar perfil |
| DELETE | `/me` | Excluir conta |

### 2FA (`/api/2fa`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/setup` | Gerar secret e QR Code |
| POST | `/enable` | Confirmar e ativar 2FA |
| POST | `/disable` | Desativar 2FA |

### Transações (`/api/transactions`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar (com filtros) |
| POST | `/` | Criar transação |
| PATCH | `/:id` | Editar transação |
| DELETE | `/:id` | Excluir transação |
| GET | `/:id/history` | Histórico de edições |
| POST | `/import` | Importar CSV |

### Metas (`/api/goals`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar metas |
| POST | `/` | Criar meta |
| PATCH | `/:id` | Editar meta |
| DELETE | `/:id` | Excluir meta |

### Relatórios (`/api/reports`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/summary` | KPIs do período |
| GET | `/by-category` | Totais por categoria |
| GET | `/trends` | Tendência mensal |

### IA (`/api/ai`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/chat` | Enviar mensagem para NovuxAI |

### Categorias (`/api/categories`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar categorias do usuário |
| POST | `/` | Criar categoria |
| DELETE | `/:id` | Excluir categoria |

---

## Banco de Dados

### Tabela `users`
```sql
id, name, email, password_hash, plan, totp_secret, totp_enabled,
created_at, updated_at
```

### Tabela `transactions`
```sql
id, user_id, type (income/expense), category, description,
value, date, tags (text[]), attachment_url, currency,
created_at, updated_at
```

### Tabela `transaction_history`
```sql
id, transaction_id, user_id, changed_fields (jsonb),
old_values (jsonb), new_values (jsonb), changed_at
```

### Tabela `goals`
```sql
id, user_id, name, target_value, current_value, deadline,
description, created_at, updated_at
```

### Tabela `categories`
```sql
id, user_id, name, type (income/expense/both), color, icon,
created_at
```

---

## Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- PostgreSQL 15+
- (Opcional) Conta Groq para IA

### Setup
```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do backend
cd backend && npm install

# Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Editar backend/.env com DATABASE_URL, JWT_SECRET, etc.

# Criar tabelas no banco
cd backend && npm run migrate

# Iniciar backend (porta 3001)
cd backend && npm run dev

# Iniciar frontend (porta 5173)
npm run dev
```

### Scripts disponíveis
```bash
# Frontend
npm run dev          # Dev server
npm run build        # Build de produção
npm run preview      # Preview do build

# Backend
npm run dev          # Dev com nodemon
npm run build        # Compilar TypeScript
npm start            # Iniciar compilado
npm run migrate      # Rodar migrations
```

---

*Documentação gerada em 2026-05-26 | Versão 1.0*
