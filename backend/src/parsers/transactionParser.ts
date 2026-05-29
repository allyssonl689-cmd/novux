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
  recurrence: 'none' | 'monthly';
  recurrence_months: number;
  paid: boolean;
  confidence: 'high' | 'low';
}

/* ─── Mapeamento de palavras-chave → categoria ─── */
const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/mercado|supermercado|feira|hortifruti|padaria|açougue/i,       'Alimentação'],
  [/restaurante|lanche|pizza|hamburguer|ifood|delivery|almoço|jantar/i, 'Alimentação'],
  [/uber|99|taxi|ônibus|metrô|trem|combustível|gasolina|estacionamento/i, 'Transporte'],
  [/aluguel|condomínio|iptu|agua|luz|energia|internet|gás/i,       'Moradia'],
  [/netflix|spotify|amazon|youtube|hbo|disney|prime|assinatura/i,  'Assinaturas'],
  [/farmácia|médico|hospital|plano.de.saúde|dentista|academia|gym/i, 'Saúde'],
  [/escola|faculdade|curso|livro|mensalidade|educação/i,           'Educação'],
  [/salário|salario|holerite|pagamento.do.trabalho/i,              'Salário'],
  [/freelance|freela|projeto|consultoria|serviço/i,                'Freelance'],
  [/cartão|cartao|credito|debito/i,                                'Cartão'],
  [/roupa|sapato|vestuário|loja/i,                                 'Vestuário'],
  [/investimento|ação|fundo|tesouro|cdb|rendimento/i,              'Investimentos'],
  [/presente|gift|aniversário/i,                                   'Presente'],
  [/reembolso|devolução|estorno/i,                                 'Reembolso'],
];

function inferCategory(text: string): string {
  for (const [regex, cat] of CATEGORY_MAP) {
    if (regex.test(text)) return cat;
  }
  return 'Outros';
}

/* ─── Regex fallback ─── */
function parseWithRegex(text: string): ParsedTransaction | null {
  // Extrai valor: R$ 1.234,56 | R$50 | 1234.56 | 50 reais | 50,90
  const valueMatch = text.match(/R?\$?\s*([\d]{1,6}(?:[.,]\d{1,3})?(?:[.,]\d{1,2})?)\s*(?:reais?)?/i);
  if (!valueMatch) return null;

  const rawVal = valueMatch[1].replace('.', '').replace(',', '.');
  const value = parseFloat(rawVal);
  if (isNaN(value) || value <= 0) return null;

  // Tipo
  const isExpense = /gastei|paguei|comprei|saiu|débito|debitei|despesa|gasto/i.test(text);
  const isIncome  = /recebi|ganhei|entrou|crédito|creditei|receita|salário|salario/i.test(text);
  const type: 'income' | 'expense' = isIncome && !isExpense ? 'income' : 'expense';

  // Recorrência
  const isMonthly = /todo.?mês|todo.?mes|mensal|fixo|recorrente/i.test(text);

  // Descrição: remove o valor e palavras de trigger
  const description = text
    .replace(/R?\$?\s*[\d.,]+\s*(?:reais?)?/gi, '')
    .replace(/gastei|paguei|comprei|recebi|ganhei|todo.?mês|mensal|fixo/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    || (type === 'income' ? 'Receita' : 'Despesa');

  return {
    type,
    value,
    category: inferCategory(text),
    description: description.charAt(0).toUpperCase() + description.slice(1),
    recurrence: isMonthly ? 'monthly' : 'none',
    recurrence_months: isMonthly ? 12 : 1,
    paid: true,
    confidence: 'low',
  };
}

/* ─── Parser via Groq LLaMA ─── */
async function parseWithGroq(text: string, groqKey: string): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Você é um extrator de dados financeiros. A partir de uma mensagem em português,
extraia os dados da transação financeira e retorne APENAS um JSON válido, sem texto extra.

Categorias disponíveis: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Salário,
Freelance, Investimentos, Assinaturas, Cartão, Vestuário, Presente, Reembolso, Outros.

Retorne exatamente este formato:
{
  "type": "expense" | "income",
  "value": número positivo,
  "category": string da lista acima,
  "description": string curta descritiva,
  "recurrence": "none" | "monthly",
  "recurrence_months": número (12 se mensal, 1 se não recorre),
  "paid": true | false
}

Hoje é ${today}. Se não conseguir extrair, retorne null.`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 200,
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

    // Extrai JSON mesmo que venha com texto ao redor
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ParsedTransaction;

    if (!parsed.type || !parsed.value || parsed.value <= 0) return null;

    return { ...parsed, confidence: 'high' };
  } catch {
    return null;
  }
}

/* ─── Função principal ─── */
export async function parseTransaction(text: string): Promise<ParsedTransaction | null> {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    const groqResult = await parseWithGroq(text, groqKey);
    if (groqResult) return groqResult;
  }

  return parseWithRegex(text);
}
