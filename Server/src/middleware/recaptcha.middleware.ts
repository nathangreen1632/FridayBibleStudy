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

/** Guard when you want to name the action inline on a route */
export function recaptchaGuard(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.headers['x-recaptcha-token'] as string | undefined) ||
      (req.body?.recaptchaToken as string | undefined);

    if (!token) { res.status(400).json({ error: 'Missing CAPTCHA token' }); return; }

    await assessAndGate(req, res, next, expectedAction, token);
  };
}

/** Rules mapping (method + path) -> Enterprise action name */
type Rule = { method: 'GET' | 'POST' | 'PATCH' | 'DELETE', pattern: RegExp, action: string };

const rules: Rule[] = [
  // /auth
  { method: 'POST', pattern: /^\/auth\/register\/?$/i,               action: 'register' },
  { method: 'POST', pattern: /^\/auth\/login\/?$/i,                  action: 'login' },
  { method: 'POST', pattern: /^\/auth\/request-reset\/?$/i,          action: 'password_reset_request' },
  { method: 'POST', pattern: /^\/auth\/reset-password\/?$/i,         action: 'password_reset' },

  // /admin
  { method: 'POST', pattern: /^\/admin\/promote\/?$/i,               action: 'admin_promote' },

  // /export
  { method: 'POST', pattern: /^\/export\/prayers\/?$/i,              action: 'export_prayers' },

  // /groups
  { method: 'PATCH', pattern: /^\/groups\/?$/i,                      action: 'group_update' },

  // /prayers
  { method: 'POST',  pattern: /^\/prayers\/?$/i,                     action: 'prayer_create' },
  { method: 'PATCH', pattern: /^\/prayers\/[^/]+\/?$/i,              action: 'prayer_update' },
  { method: 'DELETE',pattern: /^\/prayers\/[^/]+\/?$/i,              action: 'prayer_delete' },
  { method: 'POST',  pattern: /^\/prayers\/[^/]+\/updates\/?$/i,     action: 'prayer_add_update' },
  { method: 'POST',  pattern: /^\/prayers\/[^/]+\/attachments\/?$/i, action: 'media_upload' },
];

function resolveExpectedAction(req: Request): string | undefined {
  const method = req.method.toUpperCase() as Rule['method'];
  const fullPath = `${req.baseUrl || ''}${req.path || ''}`; // router-safe
  const hit = rules.find(r => r.method === method && r.pattern.test(fullPath));
  return hit?.action;
}

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
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined,
      userAgent: req.headers['user-agent'],
    });

    // 1) Token must be verified by Google
    if (!result.success) {
      res.status(400).json({ error: 'Invalid CAPTCHA token', errorCodes: result.errorCodes });
      return;
    }

    // 2) Expected action must match
    if (!result.isActionValid) {
      res.status(400).json({ error: 'CAPTCHA action mismatch', expected: expectedAction, got: result.action });
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
    res.status(502).json({ error: 'reCAPTCHA verification error', message: err?.message ?? String(err) });
  }
}

/** Path-mapped middleware: just drop it on the route; it figures out the action */
export async function recaptchaMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token =
    (req.headers['x-recaptcha-token'] as string | undefined) ||
    (req.body?.recaptchaToken as string | undefined);

  if (!token) { res.status(400).json({ error: 'Missing CAPTCHA token' }); return; }

  const expectedAction = resolveExpectedAction(req);
  if (!expectedAction) { res.status(400).json({ error: 'Unrecognized CAPTCHA route' }); return; }

  await assessAndGate(req, res, next, expectedAction, token);
}
