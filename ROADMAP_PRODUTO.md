# Novux Finance — Roadmap para Produto Comercial

## Visão Geral

Novux Finance é um app de gestão financeira pessoal full-stack com IA integrada, metas, investimentos, relatórios PDF e dashboard avançado. Este documento define o plano completo para transformar o projeto atual em um produto vendável e hospedado.

---

## Status do Deploy (atualizado em 2026-05-27)

| Serviço | URL | Status |
|---|---|---|
| Frontend | https://novux-export.vercel.app | ✅ No ar |
| Backend | https://novux.onrender.com | ✅ No ar |
| Banco de dados | Supabase (PostgreSQL) | ✅ Conectado |
| Repositório | https://github.com/allyssonl689-cmd/novux | ✅ Público |

---

## Identidade Visual — Arquivos para Substituição

Ao criar a identidade visual definitiva da Novux, substitua os seguintes arquivos:

| Arquivo | Uso | Tamanho recomendado |
|---|---|---|
| [public/favicon.ico](public/favicon.ico) | Ícone na aba do browser | 32×32 px |
| [public/icon.svg](public/icon.svg) | Ícone vetorial base (usado para gerar os demais) | SVG escalável |
| [public/icon-192.png](public/icon-192.png) | Ícone PWA (Android/Chrome) | 192×192 px |
| [public/icon-512.png](public/icon-512.png) | Ícone PWA splash screen | 512×512 px |
| [public/placeholder.svg](public/placeholder.svg) | Imagem placeholder de imagens não carregadas | SVG |

> **Dica:** Crie o logo em SVG (`icon.svg`) e use uma ferramenta como [RealFaviconGenerator](https://realfavicongenerator.net) para gerar automaticamente o `favicon.ico`, `icon-192.png` e `icon-512.png`.
>
> Após substituir os arquivos, faça commit e push — o Vercel redeploya automaticamente.

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

## 2. Implementação do Gate Premium (pendente)

O gate de premium já existe no frontend via `isPremiumPreview` no `FinanceContext`. Para produção:

1. Adicionar coluna `plan` na tabela `users`: `'free' | 'pro'`
2. Expor `plan` no JWT payload e no endpoint `GET /api/users/me`
3. No frontend, substituir `isPremiumPreview` por `user.plan === 'pro'`
4. Integrar Stripe (ou PagSeguro/Mercado Pago para BR)

---

## 3. Checklist Pré-Lançamento

### Infraestrutura
- [x] Repositório GitHub configurado
- [x] Frontend no ar (Vercel)
- [x] Backend no ar (Render)
- [x] Banco de dados criado (Supabase)
- [x] Migrations rodadas (001 a 006)
- [x] `VITE_API_URL` configurado no Vercel
- [x] `CORS_ORIGIN` configurado no Render
- [x] `GROQ_API_KEY` configurada no backend

### Identidade Visual
- [ ] Logo/ícone final criado
- [ ] Substituir `public/favicon.ico`
- [ ] Substituir `public/icon.svg`
- [ ] Substituir `public/icon-192.png`
- [ ] Substituir `public/icon-512.png`
- [ ] Atualizar cores em `public/manifest.json` (`theme_color`, `background_color`)

### Produto
- [ ] Implementar gate Free vs Pro (coluna `plan` no banco)
- [ ] Integrar gateway de pagamento (Stripe ou Mercado Pago)
- [ ] Email transacional: boas-vindas e reset de senha (Resend ou SendGrid)
- [ ] Onboarding guiado para novos usuários
- [ ] Domínio customizado (ex: `novux.com.br`)
- [ ] Google Analytics ou Plausible configurado
- [ ] Monitoramento de erros (Sentry)

### Segurança
- [x] HTTPS obrigatório em produção
- [x] Headers de segurança (Helmet)
- [x] Uploads limitados a 5MB com validação de MIME
- [x] Senhas com bcrypt rounds 12
- [x] 2FA TOTP opcional
- [x] JWT com access (15min) + refresh (7d)
- [ ] Mover JWT para httpOnly cookies (proteção XSS)
- [ ] AI usage tracking persistido no banco (não em memória)
- [ ] CSRF protection no endpoint de logout

---

## 4. Deploy — Configuração Atual

### Variáveis no Render (backend)
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.iargaqfriiaygzzsbbwq:...@aws-1-us-west-2.pooler.supabase.com:5432/postgres
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://novux-export.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
GROQ_API_KEY=gsk_...
```

### Variáveis no Vercel (frontend)
```
VITE_API_URL=https://novux.onrender.com
```

### Domínio Customizado (opcional)
1. Comprar domínio (ex: `novux.com.br`) no Registro.br (~R$40/ano)
2. No Vercel: Settings → Domains → adicionar domínio
3. Configurar DNS: CNAME `www` → `cname.vercel-dns.com`
4. Atualizar `CORS_ORIGIN` no Render para o novo domínio

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

### Frontend (Vercel env vars)
```env
VITE_API_URL=https://novux.onrender.com
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
- [ ] Gate Free vs Pro com coluna `plan` no banco

### v1.2 (2-4 meses)
- [ ] Importação de OFX/QIF (extratos Bradesco, Itaú, Nubank)
- [ ] Orçamento mensal por categoria com alertas
- [ ] Relatório anual consolidado
- [ ] Widget de resumo para iOS/Android (PWA avançado)
- [ ] Domínio customizado

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
| Render (backend) | Free | Gratuito (dorme após 15min inativo) |
| Supabase (banco) | Free | Gratuito até 500MB |
| Groq API (IA) | Free tier | Gratuito (limitado) |
| Domínio .com.br | Registro.br | ~R$40/ano |
| **Total inicial** | | **Gratuito** |

> **Nota:** O plano gratuito do Render "dorme" após 15 minutos de inatividade, causando delay de ~30s na primeira requisição. Para produção com usuários reais, considere o plano pago (~$7/mês) ou migrar para Railway ($5/mês de créditos).

Com 10 assinantes Pro (R$19,90): **R$199/mês** — já cobre custos com margem.
Break-even: **2 assinantes**.

---

*Atualizado em 2026-05-27 | Versão 1.1*
