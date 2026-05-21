import { apiFetch } from './api';
import { Transaction, TransactionType, RecurrenceType } from '@/lib/types';

interface ApiTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  value: number;
  category: string;
  date: string;
  description: string;
  notes?: string;
  recurrence: RecurrenceType;
  recurrence_months?: number;
  is_recurring: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
}

function toFrontend(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    value: Number(t.value),
    category: t.category,
    date: typeof t.date === 'string' ? t.date.slice(0, 10) : t.date,
    description: t.description,
    notes: t.notes,
    recurrence: t.recurrence,
    recurrenceMonths: t.recurrence_months,
    isRecurring: t.is_recurring,
    tags: t.tags ?? [],
  };
}

function toBackend(t: Omit<Transaction, 'id'>): Omit<ApiTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    type: t.type,
    value: t.value,
    category: t.category,
    date: t.date,
    description: t.description,
    notes: t.notes,
    recurrence: t.recurrence ?? 'none',
    recurrence_months: t.recurrenceMonths,
    is_recurring: t.isRecurring ?? false,
    tags: t.tags ?? [],
  };
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const transactionService = {
  async list(filters: TransactionFilters = {}): Promise<{ data: Transaction[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
    const qs = params.toString() ? `?${params}` : '';
    const res = await apiFetch<PaginatedResponse<ApiTransaction>>(`/api/transactions${qs}`);
    return {
      data: res.data.data.map(toFrontend),
      total: res.data.total,
      totalPages: res.data.totalPages,
    };
  },

  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const res = await apiFetch<SingleResponse<ApiTransaction>>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(toBackend(transaction)),
    });
    return toFrontend(res.data);
  },

  async update(id: string, transaction: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const res = await apiFetch<SingleResponse<ApiTransaction>>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toBackend(transaction as Omit<Transaction, 'id'>)),
    });
    return toFrontend(res.data);
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
  },

  getExportUrl(startDate?: string, endDate?: string): string {
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001') + '/api/transactions/export/csv';
    const token = localStorage.getItem('novux_access_token');
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (token) params.set('token', token);
    return params.toString() ? `${base}?${params}` : base;
  },
};
