// Server/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, type AppJwtPayload } from '../utils/jwt.util.js';
import { env } from '../config/env.config.js';
import type { Role, UserJwtPayload } from '../types/auth.types.js';

/** Coerce any unknown role into the app's Role union. */
function normalizeRole(role: unknown): Role {
  return role === 'admin' ? 'admin' : 'classic';
}

/** Extract a numeric id from common JWT fields without throwing. */
function extractNumericId(payload: Partial<Record<'id' | 'sub' | 'userId', unknown>>): number {
  const asNumber = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  for (const key of ['id', 'sub', 'userId'] as const) {
    const n = asNumber(payload[key]);
    if (n !== null) return n;
  }
  return 0;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookieName = env.JWT_COOKIE_NAME;
  const token = req.cookies?.[cookieName];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const raw = verifyJwt(token) as AppJwtPayload;

    const id = extractNumericId(raw as any);
    const role = normalizeRole((raw as any).role);

    // Pass through groupId when valid; otherwise leave undefined
    const rawGroupId = (raw as any)?.groupId;
    const groupId =
      typeof rawGroupId === 'number' && Number.isFinite(rawGroupId) && rawGroupId > 0
        ? rawGroupId
        : undefined;

    // Build normalized request user using your production shape
    const user: UserJwtPayload = {
      ...(raw as object),
      id,
      role,
      groupId,
    };

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
