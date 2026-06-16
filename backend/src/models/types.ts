export type TransactionType = 'income' | 'expense';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CategoryType = 'income' | 'expense' | 'both';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  value: number;
  category: string;
  date: string;
  description: string;
  notes: string | null;
  recurrence: RecurrenceType;
  recurrence_months: number | null;
  is_recurring: boolean;
  paid: boolean;
  payment_method: string | null;   // forma de pagamento/recebimento (ex.: pix, credito)
  paid_at: string | null;          // data efetiva do pagamento/recebimento (YYYY-MM-DD)
  payment_notes: string | null;    // detalhes do pagamento (criptografado)
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  created_at: Date;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  deadline: string | null;
  category: string | null;
  color: string | null;
  is_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
