import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  value: z.number().positive('Valor deve ser positivo'),
  category: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  notes: z.string().max(1000).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  recurrence_months: z.number().int().positive().optional(),
  is_recurring: z.boolean().default(false),
  paid: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(10).default([]),
  currency: z.string().length(3).default('BRL'),
  // Forma de pagamento/recebimento + data efetiva + observações do pagamento.
  // Nullable para permitir limpar ao desmarcar como pago.
  payment_method: z.string().max(30).optional().nullable(),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional().nullable(),
  payment_notes: z.string().max(500).optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Criação em lote (importação de CSV) — evita N requisições, uma por linha.
export const bulkCreateSchema = z.object({
  transactions: z.array(createTransactionSchema).min(1).max(1000),
});

export const transactionFiltersSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  categories: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
