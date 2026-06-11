import { apiFetch } from './api';

export interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number; // regime de caixa: realizedIncome - realizedExpenses
  incomeCount: number;
  expenseCount: number;
  realizedIncome?: number;
  realizedExpenses?: number;
  pendingIncome?: number;
  pendingExpenses?: number;
}

export interface MonthlyReport {
  month: number;
  income: number;
  expenses: number;
}

interface SummaryResponse { success: boolean; data: ReportSummary; }
interface MonthlyResponse { success: boolean; data: MonthlyReport[]; }

export const reportsService = {
  async summary(startDate: string, endDate: string): Promise<ReportSummary> {
    const res = await apiFetch<SummaryResponse>(
      `/api/reports/summary?startDate=${startDate}&endDate=${endDate}`
    );
    return res.data;
  },

  async monthly(year: number): Promise<MonthlyReport[]> {
    const res = await apiFetch<MonthlyResponse>(`/api/reports/monthly?year=${year}`);
    return res.data;
  },
};
