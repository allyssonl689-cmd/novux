import { apiFetch } from './api';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  category?: string;
  color?: string;
  isCompleted: boolean;
  createdAt: string;
}

interface ApiGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  deadline?: string;
  category?: string;
  color?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface SingleResponse<T> { success: boolean; data: T; }
interface ListResponse<T> { success: boolean; data: T[]; }

function toFrontend(g: ApiGoal): Goal {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    targetValue: Number(g.target_value),
    currentValue: Number(g.current_value),
    deadline: g.deadline ? String(g.deadline).slice(0, 10) : undefined,
    category: g.category,
    color: g.color,
    isCompleted: g.is_completed,
    createdAt: g.created_at,
  };
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  deadline?: string;
  category?: string;
  color?: string;
}

export const goalService = {
  async list(): Promise<Goal[]> {
    const res = await apiFetch<ListResponse<ApiGoal>>('/api/goals');
    return res.data.map(toFrontend);
  },

  async create(input: CreateGoalInput): Promise<Goal> {
    const res = await apiFetch<SingleResponse<ApiGoal>>('/api/goals', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        target_value: input.targetValue,
        current_value: input.currentValue ?? 0,
        deadline: input.deadline,
        category: input.category,
        color: input.color,
      }),
    });
    return toFrontend(res.data);
  },

  async update(id: string, input: Partial<CreateGoalInput> & { currentValue?: number; isCompleted?: boolean }): Promise<Goal> {
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined)        payload.title         = input.title;
    if (input.description !== undefined)  payload.description   = input.description;
    if (input.targetValue !== undefined)  payload.target_value  = input.targetValue;
    if (input.currentValue !== undefined) payload.current_value = input.currentValue;
    if (input.deadline !== undefined)     payload.deadline      = input.deadline;
    if (input.category !== undefined)     payload.category      = input.category;
    if (input.color !== undefined)        payload.color         = input.color;
    if (input.isCompleted !== undefined)  payload.is_completed  = input.isCompleted;

    const res = await apiFetch<SingleResponse<ApiGoal>>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return toFrontend(res.data);
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
  },
};
