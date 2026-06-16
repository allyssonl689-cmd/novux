/**
 * Parser de linguagem natural para transações via Telegram.
 * Estratégia: tenta Groq LLaMA primeiro; em caso de falha usa regex como fallback.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

export interface ParsedTransaction {
  type: 'income' | 'expense';
  value: number;
  category: string;
  description: string;
  date: string;          // YYYY-MM-DD — extraído da mensagem ou hoje
  recurrence: 'none' | 'monthly';
  recurrence_months: number;
  paid: boolean;
  confidence: 'high' | 'low';
}

/* ─── Categorias disponíveis (alinhadas com o app) ─── */
const CATEGORIES_EXPENSE = [
  'Alimentação', 'Restaurantes', 'Transporte', 'Moradia', 'Lazer', 'Viagens',
  'Saúde', 'Saúde Mental', 'Educação', 'Assinaturas', 'Streaming', 'Telefone',
  'Cartão', 'Vestuário', 'Pets', 'Empréstimos', 'Seguros', 'Impostos',
  'Doações', 'Presente', 'Reembolso', 'Outros',
];
const CATEGORIES_INCOME = ['Salário', 'Freelance', 'Investimentos', 'Aluguel recebido', 'Presente', 'Reembolso', 'Outros'];

/* ─── Mapeamento de palavras-chave → categoria ─── */
const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/mercado|supermercado|feira|hortifruti|padaria|açougue|compras/i,     'Alimentação'],
  [/restaurante|lanche|pizza|hamburguer|ifood|delivery|almoço|jantar|café/i, 'Restaurantes'],
  [/uber|99|taxi|ônibus|metrô|trem|combustível|gasolina|estacionamento|pedágio/i, 'Transporte'],
  [/aluguel|condomínio|iptu|agua|luz|energia|internet|gás|condominio/i,  'Moradia'],
  [/netflix|spotify|amazon|youtube|hbo|disney|prime|streaming/i,         'Streaming'],
  [/assinatura|mensalidade.app|software|saas/i,                          'Assinaturas'],
  [/farmácia|médico|hospital|plano.de.saúde|dentista|consulta|exame/i,   'Saúde'],
  [/psicólogo|terapia|saúde.mental/i,                                    'Saúde Mental'],
  [/academia|gym|crossfit/i,                                             'Saúde'],
  [/escola|faculdade|curso|livro|mensalidade.escola|educação/i,          'Educação'],
  [/celular|telefone|plano.celular/i,                                    'Telefone'],
  [/cartão|cartao|fatura|credito|debito/i,                              'Cartão'],
  [/roupa|sapato|vestuário|loja|calçado/i,                              'Vestuário'],
  [/pet|cachorro|gato|veterinário|ração/i,                              'Pets'],
  [/viagem|passagem|hotel|hospedagem|airbnb/i,                          'Viagens'],
  [/empréstimo|financiamento|parcela|prestação/i,                       'Empréstimos'],
  [/seguro|seguro.carro|seguro.vida/i,                                  'Seguros'],
  [/imposto|darf|inss|irpf|ipva|iptu.pago/i,                           'Impostos'],
  [/doação|doacao|caridade/i,                                           'Doações'],
  [/presente|gift|aniversário/i,                                        'Presente'],
  [/reembolso|devolução|estorno/i,                                      'Reembolso'],
  [/salário|salario|holerite/i,                                         'Salário'],
  [/freelance|freela|projeto|consultoria|serviço/i,                     'Freelance'],
  [/investimento|ação|fundo|tesouro|cdb|rendimento|dividendo/i,         'Investimentos'],
  [/aluguel.recebido|renda.aluguel/i,                                   'Aluguel recebido'],
];

function inferCategory(text: string): string {
  for (const [regex, cat] of CATEGORY_MAP) {
    if (regex.test(text)) return cat;
  }
  return 'Outros';
}

/* ─── Datas no fuso do Brasil (America/Sao_Paulo) ─── */
// O servidor roda em UTC (Render). Usar toISOString()/new Date(ano,mês,dia) gerava
// erro de dia p/ usuários BRT (ex.: 23h em SP já é o dia seguinte em UTC). Ancoramos
// tudo no fuso de SP e fazemos a aritmética de dias ao meio-dia UTC (seguro).
const BR_TZ = 'America/Sao_Paulo';

/** 'YYYY-MM-DD' de hoje no fuso de São Paulo. */
function todayYMDSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BR_TZ }).format(new Date());
}
/** Date ancorada ao meio-dia UTC do YMD (somar/subtrair dias não cruza fronteira em BRT). */
function anchor(ymd: string): Date {
  return new Date(`${ymd}T12:00:00Z`);
}
/** YMD a partir de uma Date ancorada ao meio-dia UTC. */
function ymd(d: Date): string {
  return d.toISOString().split('T')[0];
}

/* ─── Extração de data em português ─── */
function extractDate(text: string): string {
  const today = todayYMDSaoPaulo();
  const [year, month, day] = today.split('-').map(Number); // month é 1-based
  const todayDate = anchor(today);

  // "vencimento 05/06" | "dia 05/06" | "para 05/06" | "até 05/06"
  const ddmm = text.match(/(?:vencimento|vence|dia|para|até|ate|data|em)\s+(\d{1,2})[/-](\d{1,2})/i);
  if (ddmm) {
    const d = parseInt(ddmm[1], 10);
    const m = parseInt(ddmm[2], 10);
    const targetYear = (m < month) ? year + 1 : year;
    return `${targetYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // "05/06" ou "5/6" sem prefixo (data isolada)
  const ddmmAlone = text.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (ddmmAlone) {
    const d = parseInt(ddmmAlone[1], 10);
    const m = parseInt(ddmmAlone[2], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const targetYear = (m < month) ? year + 1 : year;
      return `${targetYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // "dia 5" | "todo dia 5" (sem mês — próxima ocorrência)
  const dia = text.match(/\bdia\s+(\d{1,2})\b/i);
  if (dia) {
    const d = parseInt(dia[1], 10);
    if (d >= 1 && d <= 31) {
      let target = new Date(Date.UTC(year, month - 1, d, 12));
      if (target <= todayDate) target = new Date(Date.UTC(year, month, d, 12));
      return ymd(target);
    }
  }

  // "amanhã"
  if (/amanhã|amanha/i.test(text)) {
    const t = anchor(today); t.setUTCDate(t.getUTCDate() + 1);
    return ymd(t);
  }

  // "semana que vem" / "próxima semana"
  if (/semana.que.vem|próxima.semana|proxima.semana/i.test(text)) {
    const t = anchor(today); t.setUTCDate(t.getUTCDate() + 7);
    return ymd(t);
  }

  // "mês que vem" / "próximo mês" (mesmo dia no mês seguinte)
  if (/mês.que.vem|mes.que.vem|próximo.mês|proximo.mes/i.test(text)) {
    const t = new Date(Date.UTC(year, month, day, 12));
    return ymd(t);
  }

  // "ontem"
  if (/ontem/i.test(text)) {
    const t = anchor(today); t.setUTCDate(t.getUTCDate() - 1);
    return ymd(t);
  }

  // Padrão: hoje
  return today;
}

/* ─── Regex fallback ─── */
function parseWithRegex(text: string): ParsedTransaction | null {
  const valueMatch = text.match(/R?\$?\s*([\d]{1,6}(?:[.,]\d{1,3})?(?:[.,]\d{1,2})?)\s*(?:reais?)?/i);
  if (!valueMatch) return null;

  const rawVal = valueMatch[1].replace('.', '').replace(',', '.');
  const value = parseFloat(rawVal);
  if (isNaN(value) || value <= 0) return null;

  const isExpense = /gastei|paguei|comprei|saiu|débito|debitei|despesa|gasto|vence|vencimento/i.test(text);
  const isIncome  = /recebi|ganhei|entrou|crédito|creditei|receita|salário|salario/i.test(text);
  const type: 'income' | 'expense' = isIncome && !isExpense ? 'income' : 'expense';

  const isMonthly = /todo.?mês|todo.?mes|mensal|fixo|recorrente/i.test(text);
  const isPending = /vence|vencimento|a.pagar|pendente|para.pagar/i.test(text);

  const description = text
    .replace(/R?\$?\s*[\d.,]+\s*(?:reais?)?/gi, '')
    .replace(/gastei|paguei|comprei|recebi|ganhei|todo.?mês|mensal|fixo|vencimento|vence/gi, '')
    .replace(/\d{1,2}[/-]\d{1,2}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    || (type === 'income' ? 'Receita' : 'Despesa');

  return {
    type,
    value,
    category: inferCategory(text),
    description: description.charAt(0).toUpperCase() + description.slice(1),
    date: extractDate(text),
    recurrence: isMonthly ? 'monthly' : 'none',
    recurrence_months: isMonthly ? 12 : 1,
    paid: !isPending,
    confidence: 'low',
  };
}

/* ─── Parser via Groq LLaMA ─── */
async function parseWithGroq(text: string, groqKey: string): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  const systemPrompt = `Você é um extrator de dados financeiros para o app Novux Finance.
A partir de uma mensagem em português, extraia os dados da transação e retorne APENAS JSON válido.

CATEGORIAS DE DESPESA: ${CATEGORIES_EXPENSE.join(', ')}
CATEGORIAS DE RECEITA: ${CATEGORIES_INCOME.join(', ')}

REGRAS DE DATA IMPORTANTES:
- Hoje é ${today} (ano ${currentYear})
- "vencimento 05/06" ou "vence 05/06" → date: "${currentYear}-06-05"
- "dia 5" sem mês → próxima ocorrência do dia 5
- "amanhã" → dia seguinte a hoje
- "ontem" → dia anterior a hoje
- Se não houver data na mensagem → use "${today}"
- Formato obrigatório: YYYY-MM-DD

REGRAS DE PAGAMENTO:
- "vencimento", "vence", "a pagar", "para pagar" → paid: false
- "paguei", "gastei", "recebi" → paid: true

Retorne EXATAMENTE este JSON (sem texto extra):
{
  "type": "expense" | "income",
  "value": número positivo,
  "category": string da lista acima,
  "description": string curta descritiva (sem data e sem valor),
  "date": "YYYY-MM-DD",
  "recurrence": "none" | "monthly",
  "recurrence_months": número (12 se mensal, 1 se não recorre),
  "paid": true | false
}

Se não conseguir extrair um valor monetário, retorne null.`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 250,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: text },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content === 'null') return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ParsedTransaction;
    if (!parsed.type || !parsed.value || parsed.value <= 0) return null;

    // Valida o formato da data retornada
    if (!parsed.date || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      parsed.date = extractDate(text);
    }

    return { ...parsed, confidence: 'high' };
  } catch {
    return null;
  }
}

/* ─── Função principal ─── */
export async function parseTransaction(text: string): Promise<ParsedTransaction | null> {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    console.log('[TelegramParser] Tentando Groq LLaMA...');
    const groqResult = await parseWithGroq(text, groqKey);
    if (groqResult) {
      console.log(`[TelegramParser] ✅ Groq — tipo=${groqResult.type} valor=${groqResult.value} data=${groqResult.date} cat="${groqResult.category}" pago=${groqResult.paid}`);
      return groqResult;
    }
    console.log('[TelegramParser] ⚠️  Groq falhou — usando regex fallback');
  } else {
    console.log('[TelegramParser] ℹ️  GROQ_API_KEY não configurada — usando regex');
  }

  const regexResult = parseWithRegex(text);
  if (regexResult) {
    console.log(`[TelegramParser] 🔍 Regex — tipo=${regexResult.type} valor=${regexResult.value} data=${regexResult.date}`);
  } else {
    console.log('[TelegramParser] ❌ Não reconheceu a mensagem');
  }
  return regexResult;
}
