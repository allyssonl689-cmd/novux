import { Transaction } from './types';

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();

function d(month: number, year: number, day: number) {
  const realMonth = ((month % 12) + 12) % 12;
  const realYear = year + Math.floor(month / 12);
  return new Date(realYear, realMonth, day).toISOString().split('T')[0];
}

function pm(offset: number) {
  const total = m - offset;
  const month = ((total % 12) + 12) % 12;
  const year = y + Math.floor(total / 12);
  return { m: month, y: year };
}

// Generate 12 months of transaction history
export function generateFullMockData(): Omit<Transaction, 'id'>[] {
  const txs: Omit<Transaction, 'id'>[] = [];
  
  for (let i = 0; i < 12; i++) {
    const { m: mo, y: yr } = pm(i);
    const salaryBase = 8500 + Math.round(Math.random() * 500);
    const freelaChance = Math.random();
    
    // Income
    txs.push({ type: 'income', value: salaryBase, category: 'Salário', date: d(mo, yr, 5), description: 'Salário mensal' });
    txs.push({ type: 'income', value: 350 + Math.round(Math.random() * 200), category: 'Investimentos', date: d(mo, yr, 15), description: 'Rendimento investimentos' });
    if (freelaChance > 0.6) {
      txs.push({ type: 'income', value: 1200 + Math.round(Math.random() * 2000), category: 'Freelance', date: d(mo, yr, 20), description: 'Projeto freelance' });
    }

    // Expenses - fixed
    txs.push({ type: 'expense', value: 2200, category: 'Moradia', date: d(mo, yr, 1), description: 'Aluguel apartamento' });
    txs.push({ type: 'expense', value: 280 + Math.round(Math.random() * 80), category: 'Moradia', date: d(mo, yr, 10), description: 'Conta de luz' });
    txs.push({ type: 'expense', value: 150, category: 'Moradia', date: d(mo, yr, 10), description: 'Internet fibra' });
    txs.push({ type: 'expense', value: 89.90, category: 'Assinaturas', date: d(mo, yr, 8), description: 'Plano de saúde' });
    txs.push({ type: 'expense', value: 55.90, category: 'Assinaturas', date: d(mo, yr, 12), description: 'Netflix + Spotify' });
    txs.push({ type: 'expense', value: 39.90, category: 'Assinaturas', date: d(mo, yr, 12), description: 'iCloud + ChatGPT' });

    // Expenses - variable
    const foodBase = 800 + Math.round(Math.random() * 400);
    txs.push({ type: 'expense', value: foodBase, category: 'Alimentação', date: d(mo, yr, 3), description: 'Supermercado do mês' });
    txs.push({ type: 'expense', value: 180 + Math.round(Math.random() * 200), category: 'Alimentação', date: d(mo, yr, 9), description: 'iFood e delivery' });
    txs.push({ type: 'expense', value: 120 + Math.round(Math.random() * 150), category: 'Alimentação', date: d(mo, yr, 18), description: 'Restaurante' });
    txs.push({ type: 'expense', value: 80 + Math.round(Math.random() * 60), category: 'Alimentação', date: d(mo, yr, 25), description: 'Café e padaria' });

    txs.push({ type: 'expense', value: 250 + Math.round(Math.random() * 150), category: 'Transporte', date: d(mo, yr, 2), description: 'Combustível' });
    txs.push({ type: 'expense', value: 80 + Math.round(Math.random() * 120), category: 'Transporte', date: d(mo, yr, 16), description: 'Uber / 99' });

    const lazerBase = i < 3 ? 400 + Math.round(Math.random() * 300) : 200 + Math.round(Math.random() * 200);
    txs.push({ type: 'expense', value: lazerBase, category: 'Lazer', date: d(mo, yr, 7), description: 'Bar e saídas' });
    txs.push({ type: 'expense', value: 100 + Math.round(Math.random() * 150), category: 'Lazer', date: d(mo, yr, 22), description: 'Cinema e eventos' });

    txs.push({ type: 'expense', value: 80 + Math.round(Math.random() * 100), category: 'Saúde', date: d(mo, yr, 11), description: 'Farmácia' });
    if (Math.random() > 0.5) {
      txs.push({ type: 'expense', value: 250 + Math.round(Math.random() * 200), category: 'Saúde', date: d(mo, yr, 19), description: 'Consulta médica' });
    }
    
    txs.push({ type: 'expense', value: 150 + Math.round(Math.random() * 100), category: 'Educação', date: d(mo, yr, 6), description: 'Curso online' });
  }

  return txs;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentValue: number;
  targetValue: number;
  deadline: string;
  monthlyContributions: number[];
}

export const MOCK_GOALS: Goal[] = [
  {
    id: '1',
    name: 'Reserva de Emergência',
    icon: '🛡️',
    color: 'hsl(212, 70%, 50%)',
    currentValue: 15400,
    targetValue: 25000,
    deadline: '2026-12-31',
    monthlyContributions: [800, 900, 1000, 850, 950, 1100, 800, 1000, 950, 1050, 900, 1000],
  },
  {
    id: '2',
    name: 'Viagem Europa',
    icon: '✈️',
    color: 'hsl(142, 71%, 45%)',
    currentValue: 8200,
    targetValue: 18000,
    deadline: '2027-06-30',
    monthlyContributions: [500, 600, 700, 800, 650, 750, 500, 600, 700, 800, 600, 700],
  },
  {
    id: '3',
    name: 'Entrada Apartamento',
    icon: '🏠',
    color: 'hsl(38, 92%, 50%)',
    currentValue: 42000,
    targetValue: 120000,
    deadline: '2029-01-01',
    monthlyContributions: [2000, 2200, 1800, 2500, 2000, 2300, 1900, 2100, 2400, 2000, 2200, 2500],
  },
];

export interface Investment {
  id: string;
  name: string;
  type: string;
  value: number;
  returnRate: number;
  risk: 'baixo' | 'moderado' | 'alto';
}

export const MOCK_INVESTMENTS: Investment[] = [
  { id: '1', name: 'Tesouro Selic 2029', type: 'Renda Fixa', value: 25000, returnRate: 13.75, risk: 'baixo' },
  { id: '2', name: 'CDB Banco Inter 120%', type: 'Renda Fixa', value: 15000, returnRate: 14.2, risk: 'baixo' },
  { id: '3', name: 'Fundo Multimercado Verde', type: 'Multimercado', value: 10000, returnRate: 11.5, risk: 'moderado' },
  { id: '4', name: 'ETF IVVB11', type: 'Ações', value: 8000, returnRate: 18.3, risk: 'alto' },
  { id: '5', name: 'FII HGLG11', type: 'FII', value: 12000, returnRate: 9.8, risk: 'moderado' },
];

export const MONTHLY_SUMMARY = Array.from({ length: 12 }, (_, i) => {
  const { m: mo, y: yr } = pm(11 - i);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const income = 8500 + Math.round(Math.random() * 2000);
  const expense = 5500 + Math.round(Math.random() * 2000);
  return {
    month: `${monthNames[mo]}/${yr}`,
    shortMonth: monthNames[mo],
    income,
    expense,
    savings: income - expense,
  };
});

export const CATEGORY_BUDGETS: Record<string, number> = {
  'Moradia': 2800,
  'Alimentação': 1500,
  'Transporte': 600,
  'Lazer': 500,
  'Saúde': 400,
  'Educação': 300,
  'Assinaturas': 200,
};
