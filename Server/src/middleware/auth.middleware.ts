// Server/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, type AppJwtPayload } from '../utils/jwt.util.js';
import { env } from '../config/env.config.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AppJwtPayload;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookieName = env.JWT_COOKIE_NAME;
  const token = req.cookies?.[cookieName];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
