import { apiFetch, tokenStore } from './api';
import { Transaction, TransactionType, RecurrenceType } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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
  paid: boolean;
  tags: string[];
  currency: string;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: { data: T[]; total: number; page: number; limit: number; totalPages: number };
}

interface SingleResponse<T> { success: boolean; data: T }

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
    paid: t.paid ?? false,
    tags: t.tags ?? [],
    currency: t.currency ?? 'BRL',
    attachmentUrl: t.attachment_url,
  };
}

function toBackend(t: Partial<Omit<Transaction, 'id'>>): Partial<ApiTransaction> {
  const out: any = {};
  if (t.type        !== undefined) out.type = t.type;
  if (t.value       !== undefined) out.value = t.value;
  if (t.category    !== undefined) out.category = t.category;
  if (t.date        !== undefined) out.date = t.date;
  if (t.description !== undefined) out.description = t.description;
  if (t.notes       !== undefined) out.notes = t.notes;
  if (t.recurrence  !== undefined) out.recurrence = t.recurrence ?? 'none';
  if (t.recurrenceMonths !== undefined) out.recurrence_months = t.recurrenceMonths;
  if (t.isRecurring !== undefined) out.is_recurring = t.isRecurring ?? false;
  if (t.paid        !== undefined) out.paid = t.paid ?? false;
  if (t.tags        !== undefined) out.tags = t.tags ?? [];
  if (t.currency    !== undefined) out.currency = t.currency ?? 'BRL';
  return out;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  categories?: string;       // lista separada por vírgula (match exato no servidor)
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string;
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface HistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  snapshot: Transaction;
  changed_at: string;
}

export const transactionService = {
  async list(filters: TransactionFilters = {}): Promise<{ data: Transaction[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
    const qs = params.toString() ? `?${params}` : '';
    const res = await apiFetch<PaginatedResponse<ApiTransaction>>(`/api/transactions${qs}`);
    return { data: res.data.data.map(toFrontend), total: res.data.total, totalPages: res.data.totalPages };
  },

  async tags(): Promise<string[]> {
    const res = await apiFetch<{ success: boolean; data: string[] }>('/api/transactions/tags');
    return res.data;
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
      body: JSON.stringify(toBackend(transaction)),
    });
    return toFrontend(res.data);
  },

  async togglePaid(id: string, paid: boolean): Promise<Transaction> {
    const res = await apiFetch<SingleResponse<ApiTransaction>>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ paid }),
    });
    return toFrontend(res.data);
  },

  async uploadAttachment(id: string, file: File): Promise<Transaction> {
    const token = tokenStore.get();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/transactions/${id}/attachment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error('Erro ao enviar comprovante');
    const json = await res.json();
    return toFrontend(json.data);
  },

  // Abre o comprovante via rota autenticada (não há mais URL pública).
  // Busca o arquivo com o token em memória e o exibe a partir de um blob.
  async openAttachment(id: string): Promise<void> {
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE}/api/transactions/${id}/attachment`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Erro ao abrir comprovante');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  async getHistory(id: string): Promise<HistoryEntry[]> {
    const res = await apiFetch<{ success: boolean; data: HistoryEntry[] }>(`/api/transactions/${id}/history`);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
  },

  async exportCSV(startDate?: string, endDate?: string): Promise<void> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params}` : '';
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE}/api/transactions/export/csv${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erro ao exportar CSV');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novux-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
