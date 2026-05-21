import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/auth';
import { UserModel } from '../models/UserModel';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userEmail: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.userId);

    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Usuário não encontrado ou inativo' });
      return;
    }

    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
}
