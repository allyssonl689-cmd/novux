# Novux Finance — Roadmap para Produto Comercial

## Visão Geral

Novux Finance é um app de gestão financeira pessoal full-stack com IA integrada, metas, investimentos, relatórios PDF e dashboard avançado. Este documento define o plano completo para transformar o projeto atual em um produto vendável e hospedado.

---

## 1. Free vs Pro — Definição de Tiers

### Tier Gratuito (Free)
| Funcionalidade | Limite |
|---|---|
| Lançamentos (transações) | Últimos 90 dias / até 200 registros |
| Categorias | Padrão do sistema (não personalizáveis) |
| Dashboard | Resumo básico (sem gráficos de tendência) |
| Relatórios | Visualização simples, sem exportação PDF/CSV |
| Metas financeiras | Até 2 metas simultâneas |
| Chat IA (NovuxAI) | 5 mensagens por dia |
| Investimentos | Apenas visualização da carteira |
| Notificações | Apenas alertas críticos |
| 2FA | Disponível (segurança gratuita) |
| PWA / offline | Disponível |
| Multi-moeda | Não disponível |
| Tags personalizadas | Não disponível |
| Anexos em transações | Não disponível |

### Tier Pro (R$ 19,90/mês ou R$ 159/ano)
| Funcionalidade | Detalhe |
|---|---|
| Transações ilimitadas | Sem limite de histórico |
| Categorias personalizadas | Criar, editar, excluir |
| Dashboard avançado | Gráficos de tendência, comparativos mensais |
| Exportação PDF | Relatório completo com insights de IA |
| Exportação CSV | Para planilhas externas |
| Importação CSV | Importar extratos bancários |
| Metas ilimitadas | Com acompanhamento e alertas |
| Chat IA ilimitado | Sem limite diário, contexto do usuário |
| Carteira de investimentos | Simulações de crescimento |
| Multi-moeda | Até 5 moedas simultâneas |
| Tags e anexos | Organização avançada por tags + recibos |
| Histórico de edições | Auditoria de alterações em transações |
| Período personalizado | Filtros além dos períodos padrão |
| Suporte prioritário | Email com SLA de 48h |

---

## 2. Implementação do Gate Premium (atual)

O gate de premium já existe no frontend via `isPremiumPreview` no `FinanceContext`. Para produção:

1. Adicionar coluna `plan` na tabela `users`: `'free' | 'pro'`
2. Expor `plan` no JWT payload e no endpoint `GET /api/users/me`
3. No frontend, substituir `isPremiumPreview` por `user.plan === 'pro'`
4. Integrar Stripe (ou PagSeguro/Mercado Pago para BR)

---

## 3. Checklist Pré-Lançamento

### Backend
- [ ] Variáveis de ambiente configuradas (ver seção 5)
- [ ] Migrations rodadas no banco de produção:
  - `backend/src/migrations/004_attachment_currency.sql`
  - `backend/src/migrations/005_transaction_history.sql`
  - `backend/src/migrations/006_totp_2fa.sql`
- [ ] GROQ_API_KEY configurada em `backend/.env`
- [ ] Rate limiting testado (100 req/15min por padrão)
- [ ] CORS configurado para o domínio de produção (`CORS_ORIGIN`)
- [ ] JWT secrets fortes (mín. 64 chars, aleatórios)
- [ ] Health check endpoint (`GET /api/health`)

### Frontend
- [ ] `VITE_API_URL` aponta para o backend de produção
- [ ] Ícones PWA finais em `public/icon-192.png` e `public/icon-512.png`
- [ ] `manifest.json` com `start_url`, `scope`, `name` corretos
- [ ] Meta tags de SEO em `index.html`
- [ ] Google Analytics ou Plausible configurado
- [ ] Testar fluxo completo: cadastro → login → transação → relatório PDF → chat IA

### Segurança
- [ ] HTTPS obrigatório em produção
- [ ] Headers de segurança (helmet já configurado)
- [ ] Uploads limitados a 5MB e tipos permitidos (já implementado)
- [ ] Senhas hasheadas com bcrypt rounds 12 (já implementado)
- [ ] 2FA opcional para todos os usuários (já implementado)

---

## 4. Deploy: Passo a Passo

### 4.1 GitHub
```bash
git init  # se ainda não for repo
git remote add origin https://github.com/SEU_USUARIO/novux-finance.git
git add .
git commit -m "feat: initial production release"
git push -u origin main
```

### 4.2 Banco de Dados — Supabase (gratuito até 500MB)
1. Criar conta em https://supabase.com
2. Novo projeto → anotar `DATABASE_URL` (postgres connection string)
3. No painel SQL Editor, rodar em ordem:
   - Schema inicial (tabelas users, transactions, categories, goals)
   - `backend/src/migrations/004_attachment_currency.sql`
   - `backend/src/migrations/005_transaction_history.sql`
   - `backend/src/migrations/006_totp_2fa.sql`
4. Copiar `DATABASE_URL` para as variáveis de ambiente do backend

### 4.3 Backend — Railway (gratuito $5/mês de créditos)
1. Criar conta em https://railway.app
2. "New Project" → "Deploy from GitHub Repo" → selecionar `novux-finance`
3. Configurar Root Directory: `backend`
4. Start Command: `npm start`
5. Variáveis de ambiente (Settings → Variables):
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://...supabase...
   JWT_SECRET=<64 chars aleatórios>
   JWT_REFRESH_SECRET=<64 chars aleatórios>
   BCRYPT_ROUNDS=12
   GROQ_API_KEY=gsk_...
   CORS_ORIGIN=https://novux.vercel.app
   ```
6. Anotar a URL gerada (ex: `https://novux-backend.up.railway.app`)

### 4.4 Frontend — Vercel (gratuito)
1. Criar conta em https://vercel.com
2. "Add New Project" → importar do GitHub
3. Framework Preset: **Vite**
4. Root Directory: `.` (raiz do repo)
5. Environment Variables:
   ```
   VITE_API_URL=https://novux-backend.up.railway.app
   ```
6. Deploy → a URL final será `https://novux.vercel.app` (ou domínio customizado)

### 4.5 Domínio Customizado (opcional)
1. Comprar domínio (ex: `novux.com.br`) no Registro.br (~R$40/ano)
2. No Vercel: Settings → Domains → adicionar domínio
3. Configurar DNS: CNAME `www` → `cname.vercel-dns.com`

---

## 5. Variáveis de Ambiente — Referência Completa

### Backend (`backend/.env`)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DB_NAME
JWT_SECRET=<gere com: openssl rand -hex 32>
JWT_REFRESH_SECRET=<gere com: openssl rand -hex 32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://seudominio.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
GROQ_API_KEY=gsk_...  # https://console.groq.com/keys
```

### Frontend (`.env` ou Vercel env vars)
```env
VITE_API_URL=https://seu-backend.railway.app
VITE_GOOGLE_CLIENT_ID=...  # opcional, para login com Google
```

---

## 6. Monetização

### Opção A — Stripe (global, recomendado para escala)
1. Conta em https://stripe.com/br
2. Criar produtos: "Novux Pro Mensal" (R$19,90) e "Novux Pro Anual" (R$159)
3. Webhooks para atualizar `users.plan` no banco após pagamento
4. Stripe Customer Portal para cancelamentos self-service

### Opção B — Mercado Pago (sem CNPJ para começar)
1. Conta pessoal PJ ou MEI em https://www.mercadopago.com.br/developers
2. Checkout Pro ou Assinaturas
3. Webhook `payment.created` → atualiza `users.plan`

### Opção C — Hotmart (infoproduto, mais simples)
1. Cadastrar o app como produto recorrente
2. Webhook de compra aprovada → ativar plano Pro no banco
3. Ideal para validação inicial sem infraestrutura de pagamento própria

---

## 7. Stack de Analytics e Suporte

| Ferramenta | Uso | Plano gratuito |
|---|---|---|
| Plausible / PostHog | Comportamento dos usuários | Sim (PostHog) |
| Sentry | Monitoramento de erros frontend+backend | Sim (5k erros/mês) |
| Crisp / Tawk.to | Chat de suporte no app | Sim |
| Resend / SendGrid | Emails transacionais (reset senha, boas-vindas) | Sim |

---

## 8. Próximas Funcionalidades (Roadmap Futuro)

### v1.1 (1-2 meses)
- [ ] Email de boas-vindas e confirmação de conta
- [ ] Reset de senha por email
- [ ] Onboarding guiado (wizard de primeiros passos)
- [ ] Notificações push via FCM (Firebase)

### v1.2 (2-4 meses)
- [ ] Importação de OFX/QIF (extratos Bradesco, Itaú, Nubank)
- [ ] Orçamento mensal por categoria com alertas
- [ ] Relatório anual consolidado
- [ ] Widget de resumo para iOS/Android (PWA avançado)

### v2.0 (4-8 meses)
- [ ] App nativo React Native (Expo)
- [ ] Integração Open Finance (dados bancários via Belvo/Pluggy)
- [ ] Assistente IA proativo (alertas semanais por email)
- [ ] Multi-tenant (contas familiares / casal)
- [ ] API pública para integrações

---

## 9. Estimativa de Custos Mensais (pós-lançamento)

| Serviço | Plano | Custo |
|---|---|---|
| Vercel (frontend) | Hobby | Gratuito |
| Railway (backend) | Starter | ~$5/mês |
| Supabase (banco) | Free | Gratuito até 500MB |
| Groq API (IA) | Free tier | Gratuito (limitado) |
| Domínio .com.br | Registro.br | ~R$40/ano |
| **Total inicial** | | **~R$30/mês** |

Com 10 assinantes Pro (R$19,90): **R$199/mês** — já cobre custos com margem.
Break-even: **2 assinantes**.

---

*Gerado em 2026-05-26 | Versão 1.0*
