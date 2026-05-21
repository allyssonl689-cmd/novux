# 🏦 GUIA: CONECTAR NOVUX A BANCOS REAIS (Open Banking)

## 📋 Visão Geral

Integrar transações reais de bancos brasileiros é crítico para diferenciar Novux. Existem 3 abordagens:

| Abordagem | Custo | Complexidade | Confiabilidade | Recomendação |
|-----------|-------|--------------|-----------------|-------------|
| **Pluggy** | $$ | Baixa | ⭐⭐⭐⭐⭐ | ✅ MELHOR |
| **Belvo** | $$ | Média | ⭐⭐⭐⭐ | ⭐ Alternativa |
| **Web Scraping** | Grátis | Alta | ⭐ | ❌ NÃO FAÇA |

---

## 🔌 OPÇÃO 1: PLUGGY (RECOMENDADO)

### Por que Pluggy?
- ✅ Maior número de bancos integrados (200+)
- ✅ Suporte específico para Brasil
- ✅ Webhooks em tempo real
- ✅ Dashboard administrativo
- ✅ SDK TypeScript
- ✅ Suporte em português
- ✅ Free tier para testes

### Bancos Suportados (Brasil)
```
Banco do Brasil
Itaú
Caixa Econômica
Bradesco
Santander
Nubank
Inter
Banco Original
Banco BTG
Votorantim
XP Investimentos
Avenue
Toro
...e mais 100+ instituições
```

### Setup Pluggy

#### 1. Criar Conta
```bash
# https://pluggy.ai/
# Signup → Criar app → Copiar:
# - clientId
# - clientSecret
```

#### 2. Instalar SDK
```bash
npm install pluggy-sdk
```

#### 3. Backend (Node.js + Express)
```typescript
// backend/routes/auth.ts
import axios from 'axios';

const PLUGGY_API = 'https://api.pluggy.ai';
const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL}/api/auth/callback`;

// 1. Gerar link de autenticação
app.post('/api/auth/pluggy-link', async (req, res) => {
  try {
    const response = await axios.post(`${PLUGGY_API}/auth/token`, {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    const { accessToken } = response.data;

    // Usar accessToken para gerar link único de conexão
    const itemResponse = await axios.post(
      `${PLUGGY_API}/items`,
      {
        redirectUrl: REDIRECT_URI,
      },
      { headers: { 'X-API-Token': accessToken } }
    );

    res.json({
      redirectUrl: itemResponse.data.redirectUrl,
      itemId: itemResponse.data.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Callback após autenticação do usuário no banco
app.get('/api/auth/callback', async (req, res) => {
  const { itemId, status } = req.query;

  if (status !== 'success') {
    return res.redirect(`${process.env.APP_URL}/error`);
  }

  try {
    // Salvar itemId no banco de dados do usuário
    const user = req.user; // Autenticado via JWT
    await User.updateOne(
      { _id: user.id },
      { pluggyItemId: itemId }
    );

    // Buscar contas
    const accounts = await getPluggyAccounts(itemId);
    
    // Salvar contas
    await Account.insertMany(
      accounts.map(acc => ({
        userId: user.id,
        pluggyAccountId: acc.id,
        name: acc.name,
        type: acc.type, // checking, savings, credit
        balance: acc.balance?.available || 0,
        institution: acc.institution?.name,
        synced_at: new Date(),
      }))
    );

    res.redirect(`${process.env.APP_URL}/dashboard?status=success`);
  } catch (error) {
    res.redirect(`${process.env.APP_URL}/error`);
  }
});
```

#### 4. Sincronizar Transações
```typescript
// backend/services/pluggy.service.ts
import axios from 'axios';

class PluggyService {
  private accessToken: string;

  constructor() {
    this.accessToken = '';
    this.authenticate();
  }

  private async authenticate() {
    const response = await axios.post(`${PLUGGY_API}/auth/token`, {
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    });
    this.accessToken = response.data.accessToken;
  }

  async getTransactions(
    accountId: string,
    from?: Date,
    to?: Date
  ) {
    const params = new URLSearchParams({
      accountId,
      ...(from && { from: from.toISOString() }),
      ...(to && { to: to.toISOString() }),
    });

    const response = await axios.get(
      `${PLUGGY_API}/transactions?${params}`,
      { headers: { 'X-API-Token': this.accessToken } }
    );

    return response.data.results;
  }

  async syncUserTransactions(userId: string) {
    const user = await User.findById(userId);
    const accounts = await Account.find({ userId });

    for (const account of accounts) {
      const transactions = await this.getTransactions(
        account.pluggyAccountId,
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // últimos 90 dias
      );

      // Inserir transações
      const dbTransactions = transactions.map(tx => ({
        userId,
        accountId: account._id,
        pluggyTransactionId: tx.id,
        description: tx.description,
        amount: Math.abs(tx.amount),
        type: tx.type === 'DEBIT' ? 'expense' : 'income',
        category: this.mapCategory(tx.category),
        date: new Date(tx.date),
        merchant: tx.merchant?.name,
        status: tx.status,
        externalId: tx.id,
      }));

      await Transaction.insertMany(dbTransactions, { ordered: false });
    }
  }

  private mapCategory(pluggyCategory: string): string {
    const mapping: Record<string, string> = {
      'FOOD_AND_DRINK': 'alimentacao',
      'TRANSPORTATION': 'transporte',
      'UTILITIES': 'moradia',
      'ENTERTAINMENT': 'lazer',
      'HEALTHCARE': 'saude',
      'EDUCATION': 'educacao',
      'SALARY': 'salario',
      'INVESTMENTS': 'investimentos',
      'SERVICES': 'servicos',
    };
    return mapping[pluggyCategory] || 'outros';
  }
}

export const pluggyService = new PluggyService();
```

#### 5. Webhooks (Sync em Tempo Real)
```typescript
// backend/webhooks/pluggy.webhook.ts
import crypto from 'crypto';

app.post('/webhooks/pluggy', async (req, res) => {
  // Validar assinatura
  const signature = req.headers['x-pluggy-signature'];
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PLUGGY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  if (event === 'item.created') {
    console.log('Novo item conectado:', data.itemId);
  }

  if (event === 'transaction.created') {
    // Nova transação disponível
    const { accountId, transaction } = data;
    
    const account = await Account.findOne({ pluggyAccountId: accountId });
    await Transaction.create({
      userId: account.userId,
      accountId: account._id,
      pluggyTransactionId: transaction.id,
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      type: transaction.type === 'DEBIT' ? 'expense' : 'income',
      date: new Date(transaction.date),
    });

    // Notificar usuário
    await notificationService.notify(account.userId, {
      title: 'Transação sincronizada',
      body: `${transaction.description}: ${transaction.amount}`,
    });
  }

  res.json({ success: true });
});
```

#### 6. Frontend (React)
```typescript
// frontend/pages/BankConnect.tsx
import { useEffect, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';

export default function BankConnect() {
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/pluggy-link', {
        method: 'POST',
      });
      const { redirectUrl } = await response.json();
      window.location.href = redirectUrl; // Redireciona para autenticação do banco
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Conectar Banco</h1>
      <p className="text-muted-foreground mb-6">
        Sincronize suas transações automaticamente com Novux
      </p>
      
      <button
        onClick={handleConnect}
        disabled={loading}
        className="btn-novux w-full"
      >
        {loading ? 'Conectando...' : 'Conectar Banco'}
      </button>

      <p className="text-xs text-muted-foreground mt-4">
        ✓ Seus dados são criptografados
        ✓ Você pode desconectar a qualquer momento
        ✓ Pluggy é PCI DSS compliant
      </p>
    </div>
  );
}
```

---

## 🔌 OPÇÃO 2: BELVO (Alternativa)

### Setup Similar
```bash
npm install belvo
```

```typescript
// backend/services/belvo.service.ts
import { Belvo } from 'belvo-typescript-sdk';

const belvo = new Belvo({
  clientId: process.env.BELVO_CLIENT_ID,
  clientSecret: process.env.BELVO_CLIENT_SECRET,
});

async function connectBank(user: string, institution: string) {
  // Criar link único
  const link = await belvo.links.create({
    institution,
    username: user,
  });

  // Retornar URL para usuário autenticar
  return link.session_url;
}

async function getTransactions(linkId: string) {
  const transactions = await belvo.transactions.list({
    link: linkId,
    date_from: '2024-01-01',
  });

  return transactions;
}
```

---

## 🚫 OPÇÃO 3: WEB SCRAPING (NÃO RECOMENDADO)

### Por que evitar?
- ❌ Viola termos de serviço dos bancos
- ❌ Quebra frequentemente (updates do banco)
- ❌ Dados inconsistentes
- ❌ Risco legal
- ❌ Sem suporte da plataforma
- ❌ Impossível detectar fraudes

**Não implemente scraping!**

---

## 📊 Fluxo Completo de Integração

```
┌─────────────────────────────────────────────────────────┐
│ User clica em "Conectar Banco" no Novux                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Backend gera link Pluggy único                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ User é redirecionado para Pluggy                        │
│ → Escolhe seu banco                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ User faz login no banco (2FA se necessário)            │
│ → Banco autoriza acesso                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Pluggy sincroniza contas e transações                    │
│ → Envia webhook para backend                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Backend salva dados no banco                             │
│ → Cria categorias automáticas                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend sincroniza com novo user                        │
│ → Mostra transações na Dashboard                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança na Integração

### Essencial
```typescript
// 1. Nunca armazenar credenciais
// ❌ NÃO FAÇA
localStorage.setItem('bank_password', password);

// ✅ FAÇA - Use OAuth/tokens seguros
const token = generateJWT({ itemId, expiresIn: '1h' });

// 2. Validar webhooks
const isValid = crypto
  .timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

// 3. Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requisições
}));

// 4. Encriptar dados sensíveis
const encrypted = crypto
  .createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY)
  .update(data)
  .final();

// 5. Logs de auditoria
logger.info({
  event: 'bank_connected',
  userId,
  institutionName,
  timestamp: new Date(),
  ip: req.ip,
});
```

---

## 💰 Custos Estimados

### Pluggy (Recomendado)
- Setup: $0
- Por conexão: $0.50-2.00 (depende do volume)
- Transações: Incluídas
- Taxa de API: $0/mês até 10k requisições

**Estimativa para 10k usuários**: ~$1.000-5.000/mês

### Belvo
- Similar ao Pluggy
- Pode ser mais caro em alta escala

### Infrastructure (Backend + DB)
- Servidor Node.js: $50-200/mês
- PostgreSQL: $50-100/mês
- Redis: $20-50/mês
- **Total**: ~$150-400/mês (sem escala)

---

## 🚀 Roadmap Implementação

### Fase 1 (Semana 1-2)
- [ ] Setup Pluggy (create account + API keys)
- [ ] Criar rotas de autenticação
- [ ] Implementar callback

### Fase 2 (Semana 3-4)
- [ ] Sincronizar contas
- [ ] Salvar transações
- [ ] Mapear categorias

### Fase 3 (Semana 5-6)
- [ ] Webhooks em tempo real
- [ ] Frontend de conexão
- [ ] Testes de segurança

### Fase 4 (Semana 7-8)
- [ ] Multi-conexão (2+ bancos)
- [ ] Dashboard de sincronização
- [ ] Suporte

---

## ✅ Checklist de Segurança

- [ ] HTTPS obrigatório
- [ ] Validação de webhooks
- [ ] Rate limiting
- [ ] Criptografia end-to-end
- [ ] Logs de auditoria
- [ ] Testes penetration
- [ ] GDPR compliance
- [ ] PCI DSS (se armazenar dados)
- [ ] Backup automático
- [ ] Disaster recovery

---

## 🎯 Resumo

**Para conectar Novux a bancos reais:**

1. ✅ **Use Pluggy** (melhor custo-benefício)
2. ✅ **Implemente OAuth** (não credenciais)
3. ✅ **Configure webhooks** (sync em tempo real)
4. ✅ **Categorize automático** (ML/regras)
5. ✅ **Audite segurança** (antes de produção)

Com isso, Novux passa de **protótipo** para **aplicação real e diferenciada**.
