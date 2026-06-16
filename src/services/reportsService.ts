import { apiFetch } from './api';

/** Totais de um período (regime de caixa no `balance`). Valores já numéricos. */
export interface PeriodSummary {
  totalIncome: number;
  totalExpenses: number;
  realizedIncome: number;
  realizedExpenses: number;
  pendingIncome: number;
  pendingExpenses: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

/** Linha do breakdown de categorias (total/count vêm como string do Postgres). */
export interface CategoryBreakdownRow {
  category: string;
  type: 'income' | 'expense';
  total: string;
  count: string;
}

export interface SummaryReport {
  summary: PeriodSummary;
  previous: PeriodSummary;
  categories: CategoryBreakdownRow[];
  period: { start: string; end: string };
  previousPeriod: { start: string; end: string };
}

/** Uma linha por mês (YYYY-MM) de todo o histórico, com status de pagamento. */
export interface MonthlyBreakdownRow {
  month: string;
  income: number;
  expense: number;
  received: number;
  toReceive: number;
  paid: number;
  pending: number;
}

interface ApiResponse<T> { success: boolean; data: T; }

export const reportsService = {
  async summary(startDate: string, endDate: string): Promise<SummaryReport> {
    const res = await apiFetch<ApiResponse<SummaryReport>>(
      `/api/reports/summary?startDate=${startDate}&endDate=${endDate}`,
    );
    return res.data;
  },

  async monthlyBreakdown(): Promise<MonthlyBreakdownRow[]> {
    const res = await apiFetch<ApiResponse<{ months: MonthlyBreakdownRow[] }>>(
      `/api/reports/monthly-breakdown`,
    );
    return res.data.months;
  },
};
