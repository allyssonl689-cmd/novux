export type TransactionType = 'income' | 'expense';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  type: TransactionType;
  value: number;
  category: string;
  date: string;
  description: string;
  notes?: string;
  recurrence?: RecurrenceType;
  recurrenceMonths?: number;
  isRecurring?: boolean;
  tags?: string[];
  paid?: boolean;
  currency?: string;
  attachmentUrl?: string;
  paymentMethod?: string | null;   // forma de pagamento/recebimento (código)
  paidAt?: string | null;          // data efetiva do pagamento/recebimento (YYYY-MM-DD)
  paymentNotes?: string | null;    // detalhes do pagamento
}

export interface PaymentMethodOption { code: string; label: string }

/** Formas de PAGAMENTO (despesas). */
export const EXPENSE_PAYMENT_METHODS: PaymentMethodOption[] = [
  { code: 'pix',               label: 'Pix' },
  { code: 'credito',           label: 'Cartão de crédito' },
  { code: 'debito',            label: 'Cartão de débito' },
  { code: 'dinheiro',          label: 'Dinheiro' },
  { code: 'boleto',            label: 'Boleto' },
  { code: 'transferencia',     label: 'Transferência (TED/DOC)' },
  { code: 'debito_automatico', label: 'Débito automático' },
  { code: 'outro',             label: 'Outro' },
];

/** Formas de RECEBIMENTO (receitas). */
export const INCOME_PAYMENT_METHODS: PaymentMethodOption[] = [
  { code: 'pix',           label: 'Pix' },
  { code: 'dinheiro',      label: 'Dinheiro' },
  { code: 'transferencia', label: 'Transferência (TED/DOC)' },
  { code: 'cartao',        label: 'Cartão (maquininha)' },
  { code: 'boleto',        label: 'Boleto' },
  { code: 'deposito',      label: 'Depósito' },
  { code: 'outro',         label: 'Outro' },
];

export function paymentMethodsFor(type: TransactionType): PaymentMethodOption[] {
  return type === 'income' ? INCOME_PAYMENT_METHODS : EXPENSE_PAYMENT_METHODS;
}

/** Rótulo legível a partir do código da forma de pagamento. */
export function paymentMethodLabel(code?: string | null): string {
  if (!code) return '';
  const all = [...EXPENSE_PAYMENT_METHODS, ...INCOME_PAYMENT_METHODS];
  return all.find(m => m.code === code)?.label ?? code;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface Insight {
  id: string;
  level: 'critical' | 'warning' | 'info' | 'positive';
  label: string;
  text: string;
}

export const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', label: 'Real Brasileiro' },
  { code: 'USD', symbol: '$',  label: 'Dólar Americano' },
  { code: 'EUR', symbol: '€',  label: 'Euro' },
  { code: 'GBP', symbol: '£',  label: 'Libra Esterlina' },
  { code: 'ARS', symbol: '$',  label: 'Peso Argentino' },
];

// Fixed conversion rates to BRL (updated manually until live API)
export const RATES_TO_BRL: Record<string, number> = {
  BRL: 1,
  USD: 5.42,
  EUR: 5.88,
  GBP: 6.85,
  ARS: 0.0057,
};

export function toBRL(value: number, currency: string): number {
  return value * (RATES_TO_BRL[currency] ?? 1);
}

export const DEFAULT_CATEGORIES: Category[] = [
  /* ── Despesas ── */
  { id: 'alimentacao',   name: 'Alimentação',    isDefault: true },
  { id: 'restaurantes',  name: 'Restaurantes',   isDefault: true },
  { id: 'transporte',    name: 'Transporte',     isDefault: true },
  { id: 'moradia',       name: 'Moradia',        isDefault: true },
  { id: 'lazer',         name: 'Lazer',          isDefault: true },
  { id: 'viagens',       name: 'Viagens',        isDefault: true },
  { id: 'saude',         name: 'Saúde',          isDefault: true },
  { id: 'saude_mental',  name: 'Saúde Mental',   isDefault: true },
  { id: 'educacao',      name: 'Educação',       isDefault: true },
  { id: 'assinaturas',   name: 'Assinaturas',    isDefault: true },
  { id: 'streaming',     name: 'Streaming',      isDefault: true },
  { id: 'telefone',      name: 'Telefone',       isDefault: true },
  { id: 'cartao',        name: 'Cartão',         isDefault: true },
  { id: 'vestuario',     name: 'Vestuário',      isDefault: true },
  { id: 'pets',          name: 'Pets',           isDefault: true },
  { id: 'emprestimos',   name: 'Empréstimos',    isDefault: true },
  { id: 'seguros',       name: 'Seguros',        isDefault: true },
  { id: 'impostos',      name: 'Impostos',       isDefault: true },
  { id: 'doacoes',       name: 'Doações',        isDefault: true },
  { id: 'presente',      name: 'Presente',       isDefault: true },
  { id: 'reembolso',     name: 'Reembolso',      isDefault: true },
  { id: 'outros',        name: 'Outros',         isDefault: true },
  /* ── Receitas ── */
  { id: 'salario',       name: 'Salário',        isDefault: true },
  { id: 'freelance',     name: 'Freelance',      isDefault: true },
  { id: 'investimentos', name: 'Investimentos',  isDefault: true },
  { id: 'aluguel_rec',   name: 'Aluguel recebido', isDefault: true },
];
