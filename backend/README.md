# Novux Finance — Backend API

API REST em Node.js + TypeScript + PostgreSQL para o Novux Finance.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Banco de dados**: PostgreSQL 15+
- **Linguagem**: TypeScript 5
- **Auth**: JWT (access 15min + refresh 7d)
- **Validação**: Zod
- **Segurança**: Helmet, CORS, Rate Limiting, bcryptjs

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 3. Criar banco de dados no PostgreSQL
createdb novux_finance

# 4. Executar migrações
npm run migrate

# 5. Iniciar em desenvolvimento
npm run dev
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor com hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Produção (requer build) |
| `npm run migrate` | Executar migrações SQL |

## Endpoints da API

### Autenticação
```
POST   /api/auth/register     Cadastrar usuário
POST   /api/auth/login        Login
POST   /api/auth/refresh      Renovar access token
POST   /api/auth/logout       Logout (invalida refresh token)
GET    /api/auth/me           Dados do token atual
```

### Transações
```
GET    /api/transactions              Listar (com filtros e paginação)
GET    /api/transactions/export/csv   Exportar CSV
GET    /api/transactions/:id          Buscar por ID
POST   /api/transactions              Criar
PUT    /api/transactions/:id          Atualizar
DELETE /api/transactions/:id          Remover
```

**Filtros disponíveis** (`GET /api/transactions`):
- `type=income|expense`
- `category=Alimentação`
- `startDate=2024-01-01`
- `endDate=2024-12-31`
- `search=supermercado`
- `page=1&limit=50`

### Categorias
```
GET    /api/categories        Listar (padrão + personalizadas)
POST   /api/categories        Criar categoria personalizada
PUT    /api/categories/:id    Atualizar (não permite alterar padrões)
DELETE /api/categories/:id    Remover (não permite remover padrões)
```

### Metas
```
GET    /api/goals             Listar
GET    /api/goals/:id         Buscar por ID
POST   /api/goals             Criar
PUT    /api/goals/:id         Atualizar (inclui current_value e is_completed)
DELETE /api/goals/:id         Remover
```

### Relatórios
```
GET    /api/reports/summary   Resumo por período (padrão: mês atual)
GET    /api/reports/monthly   Resumo mensal por ano
```

### Usuário
```
GET    /api/users/me          Perfil do usuário autenticado
PUT    /api/users/me          Atualizar perfil (name, avatar_url)
```

### Health Check
```
GET    /health                Status do servidor
```

## Autenticação

Todas as rotas (exceto `/api/auth/register`, `/api/auth/login`, `/health`) requerem:

```
Authorization: Bearer <access_token>
```

## Estrutura de arquivos

```
src/
├── app.ts                  # Entry point
├── config/
│   ├── env.ts              # Validação de variáveis de ambiente
│   ├── database.ts         # Pool de conexões PostgreSQL
│   └── auth.ts             # JWT sign/verify
├── middleware/
│   ├── authMiddleware.ts   # Verificação JWT
│   ├── errorHandler.ts     # Handler global de erros
│   └── rateLimiter.ts      # Rate limiting
├── models/
│   ├── types.ts            # Interfaces TypeScript
│   ├── UserModel.ts        # Queries de usuário
│   ├── TransactionModel.ts # Queries de transações
│   ├── CategoryModel.ts    # Queries de categorias
│   └── GoalModel.ts        # Queries de metas
├── services/
│   └── authService.ts      # Lógica de negócio de auth
├── controllers/            # Handlers HTTP
├── routes/                 # Definição de rotas
├── validators/             # Schemas Zod
└── migrations/
    ├── 001_initial_schema.sql
    └── run.ts
```

## Próximos passos (Mês 2)

- [ ] Integração Pluggy (Open Banking)
- [ ] Webhooks de sincronização bancária
- [ ] Categorização automática de transações
- [ ] Backup automático do banco
