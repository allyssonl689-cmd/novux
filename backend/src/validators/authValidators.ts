import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100)
    .regex(/^[^<>]+$/, 'Nome contém caracteres inválidos'),
  email: z.string().email('Email inválido').toLowerCase(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Nova senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Nova senha deve conter pelo menos um número'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Nova senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Nova senha deve conter pelo menos um número'),
});

export const login2faSchema = z.object({
  tempToken: z.string().min(1, 'tempToken é obrigatório'),
  totpToken: z.string().min(1, 'Código 2FA é obrigatório'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
});

// Código TOTP: exatamente 6 dígitos (B4). Recovery codes entram por outro fluxo
// (login/2fa), não por este schema — então aqui pode ser estrito.
export const totpTokenSchema = z.object({
  token: z.string().trim().regex(/^\d{6}$/, 'Código deve ter exatamente 6 dígitos'),
});

export const googleCredentialSchema = z.object({
  credential: z.string().min(1, 'credential é obrigatório'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
