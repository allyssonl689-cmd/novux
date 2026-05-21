import { z } from 'zod';

export const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  target_value: z.number().positive('Valor alvo deve ser positivo'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  current_value: z.number().min(0).optional(),
  is_completed: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
