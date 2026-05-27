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
  { id: 'alimentacao',  name: 'Alimentação',    isDefault: true },
  { id: 'transporte',   name: 'Transporte',     isDefault: true },
  { id: 'moradia',      name: 'Moradia',        isDefault: true },
  { id: 'lazer',        name: 'Lazer',          isDefault: true },
  { id: 'saude',        name: 'Saúde',          isDefault: true },
  { id: 'educacao',     name: 'Educação',       isDefault: true },
  { id: 'salario',      name: 'Salário',        isDefault: true },
  { id: 'investimentos',name: 'Investimentos',  isDefault: true },
  { id: 'freelance',    name: 'Freelance',      isDefault: true },
  { id: 'assinaturas',  name: 'Assinaturas',    isDefault: true },
  { id: 'cartao',       name: 'Cartão',         isDefault: true },
  { id: 'saude_bem',    name: 'Saúde/Bem-estar',isDefault: true },
  { id: 'vestuario',    name: 'Vestuário',      isDefault: true },
  { id: 'outros',       name: 'Outros',         isDefault: true },
];
