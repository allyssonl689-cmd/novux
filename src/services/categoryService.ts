import { apiFetch } from './api';
import { Category } from '@/lib/types';

interface ApiCategory {
  id: string;
  user_id?: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  color?: string;
  icon?: string;
  is_default: boolean;
}

interface ListResponse<T> { success: boolean; data: T[]; }
interface SingleResponse<T> { success: boolean; data: T; }

function toFrontend(c: ApiCategory): Category {
  return { id: c.id, name: c.name, isDefault: c.is_default };
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const res = await apiFetch<ListResponse<ApiCategory>>('/api/categories');
    return res.data.map(toFrontend);
  },

  async create(name: string, type: 'income' | 'expense' | 'both' = 'both'): Promise<Category> {
    const res = await apiFetch<SingleResponse<ApiCategory>>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
    return toFrontend(res.data);
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
  },
};
