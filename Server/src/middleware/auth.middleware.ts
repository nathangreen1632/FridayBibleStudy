// Server/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, type AppJwtPayload } from '../utils/jwt.util.js';
import { env } from '../config/env.config.js';

/** App-wide role type used in admin checks */
type AppRole = 'admin' | 'classic';

/** The normalized shape we want everywhere in the app. */
type AuthUser = AppJwtPayload & {
  id: number;          // normalized numeric user id
  role?: AppRole;      // normalized role (defaults to 'classic')
};

/** Teach Express about our normalized user shape. */
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/** Safely coerce an unknown role into our AppRole union. */
function normalizeRole(role: unknown): AppRole {
  return role === 'admin' ? 'admin' : 'classic';
}

/** Extract a numeric id from common JWT fields without throwing. */
function extractUserId(payload: Partial<Record<'id' | 'sub' | 'userId', unknown>>): number {
  // small helper: parse to number if valid
  function asNumber(val: unknown): number | null {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  // check each known field in order
  const fields: (keyof typeof payload)[] = ['id', 'sub', 'userId'];

  for (const key of fields) {
    const candidate = asNumber(payload[key]);
    if (candidate !== null) return candidate;
  }

  // fallback if nothing usable
  return 0;
}


export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookieName = env.JWT_COOKIE_NAME;
  const token = req.cookies?.[cookieName];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const payload = verifyJwt(token); // AppJwtPayload

    // Normalize id + role while preserving the rest of your payload
    const id = extractUserId(payload as any);
    const role = normalizeRole((payload as any).role);

    req.user = { ...payload, id, role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
