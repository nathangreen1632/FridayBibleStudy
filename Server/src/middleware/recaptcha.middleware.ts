// Server/src/middleware/recaptcha.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyRecaptchaToken } from '../services/recaptcha.service.js';

/** Extend Request so downstream handlers can read the assessment */
declare module 'express-serve-static-core' {
  interface Request {
    recaptcha?: {
      score: number;
      action: string;
      valid: boolean;
      hostname?: string;
    };
  }
}

/** -------- helpers: route → action resolution (tolerates /api mount) -------- */

// Map “METHOD path” → Enterprise action
const ACTIONS: Record<string, string> = {
  // AUTH
  'POST /auth/login': 'login',
  'POST /auth/register': 'register',
  'POST /auth/request-reset': 'password_reset_request',
  'POST /auth/reset-password': 'password_reset',

  // ADMIN
  'POST /admin/promote': 'admin_promote',

  // EXPORT
  'POST /export/prayers': 'export_prayers',

  // GROUPS
  'PATCH /groups': 'group_update',

  // PRAYERS
  'POST /prayers': 'prayer_create',
  'PATCH /prayers/:id': 'prayer_update',
  'DELETE /prayers/:id': 'prayer_delete',
  'POST /prayers/:id/updates': 'prayer_add_update',
  'POST /prayers/:id/attachments': 'media_upload',
};

// Generate multiple lookup keys that tolerate the /api prefix and router mounts
function routeKeyCandidates(req: Request): string[] {
  const method = req.method.toUpperCase();

  const base = req.baseUrl || ''; // e.g. "/auth"
  const routePath = (req.route && (req.route.path as string)) || ''; // e.g. "/login" or "/:id/updates"
  const path = req.path || ''; // e.g. "/auth/login"
  const origNoQuery = (req.originalUrl || '').replace(/\?.*$/, ''); // e.g. "/api/auth/login?x=1" -> "/api/auth/login"
  const origNoApi = origNoQuery.replace(/^\/api\b/, ''); // "/auth/login"

  // Normalize numeric IDs to ":id" so "/prayers/123" matches "/prayers/:id"
  const normalize = (p: string) => p.replace(/\/\d+(?=\/|$)/g, '/:id');

  const set = new Set<string>([
    `${method} ${base}${routePath}`,
    `${method} ${path}`,
    `${method} ${origNoQuery}`,
    `${method} ${origNoApi}`,
    `${method} ${normalize(base + routePath)}`,
    `${method} ${normalize(path)}`,
    `${method} ${normalize(origNoQuery)}`,
    `${method} ${normalize(origNoApi)}`,
  ]);

  // Drop keys with empty paths
  return Array.from(set).filter(k => k.split(' ')[1]);
}

function resolveExpectedAction(req: Request): string | null {
  for (const key of routeKeyCandidates(req)) {
    if (ACTIONS[key]) return ACTIONS[key];
  }
  return null;
}

/** -------- shared assessor -------- */

async function assessAndGate(
  req: Request,
  res: Response,
  next: NextFunction,
  expectedAction: string,
  token: string
): Promise<void> {
  try {
    const result = await verifyRecaptchaToken({
      token,
      expectedAction,
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined,
      userAgent: req.headers['user-agent'],
    });

    // 1) Token must be verified by Google
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid CAPTCHA token',
        errorCodes: result.errorCodes,
        action: result.action, // <— added so you can see what action Google parsed
      });
      return;
    }

    // 2) Expected action must match
    if (!result.isActionValid) {
      res.status(400).json({
        error: 'CAPTCHA action mismatch',
        expected: expectedAction,
        got: result.action,
      });
      return;
    }

    // 3) Score must meet threshold
    if (!result.isScoreAcceptable) {
      res.status(403).json({ error: 'CAPTCHA score too low', score: result.score });
      return;
    }

    // Attach summary for downstream handlers
    req.recaptcha = {
      score: result.score ?? 0,
      action: result.action ?? expectedAction,
      valid: true,
      hostname: result.hostname,
    };

    next();
  } catch (err: any) {
    res
      .status(502)
      .json({ error: 'reCAPTCHA verification error', message: err?.message ?? String(err) });
  }
}

/** -------- public middlewares -------- */

/** Guard when you want to name the action inline on a route */
export function recaptchaGuard(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.headers['x-recaptcha-token'] as string | undefined) ||
      (req.body?.recaptchaToken as string | undefined);

    if (!token) {
      res.status(400).json({ error: 'Missing CAPTCHA token' });
      return;
    }

    await assessAndGate(req, res, next, expectedAction, token);
  };
}

/** Path-mapped middleware: drop it on routes; it figures out the action */
export async function recaptchaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    (req.headers['x-recaptcha-token'] as string | undefined) ||
    (req.body?.recaptchaToken as string | undefined);

  if (!token) {
    res.status(400).json({ error: 'Missing CAPTCHA token' });
    return;
  }

  const expectedAction = resolveExpectedAction(req);
  if (!expectedAction) {
    if (process.env.NODE_ENV !== 'production') {
      // Helpful during development: shows what keys we tried
      // eslint-disable-next-line no-console
      console.warn('[reCAPTCHA] Unrecognized route. Candidates:', routeKeyCandidates(req));
    }
    res.status(400).json({ error: 'Unrecognized CAPTCHA route' });
    return;
  }

  await assessAndGate(req, res, next, expectedAction, token);
}
