import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Dados inválidos',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Erro de constraint único do PostgreSQL (ex: email duplicado)
  if ((err as NodeJS.ErrnoException).code === '23505') {
    res.status(409).json({ success: false, message: 'Recurso já existe' });
    return;
  }

  console.error('Erro não tratado:', err);

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
