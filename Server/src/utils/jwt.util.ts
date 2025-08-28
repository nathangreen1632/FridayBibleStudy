// Server/src/utils/jwt.util.ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';

export interface AppJwtPayload {
  userId: number;
  role: 'classic' | 'admin';
  iat?: number;
  exp?: number;
}

export function signJwt(payload: AppJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.JWT_FIXED_EXP_HOURS}h` });
}

export function verifyJwt(token: string): AppJwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  const { userId, role, iat, exp } = decoded as Partial<AppJwtPayload>;
  if (typeof userId !== 'number' || (role !== 'classic' && role !== 'admin')) {
    throw new Error('Invalid token payload');
  }
  return { userId, role, iat, exp };
}
