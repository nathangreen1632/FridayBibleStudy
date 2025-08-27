import type { Request, Response, NextFunction } from 'express';
import '../config/dotenv.config.js';
import { verifyAndGateRecaptcha } from '../helpers/recaptcha.helper.js';

/** Guard variant: router.post('/login', recaptchaGuard('login'), ...) */
export function recaptchaGuard(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.body?.recaptchaToken as string | undefined) ||
      (req.body?.captchaToken as string | undefined) ||
      (req.headers['x-recaptcha-token'] as string | undefined) ||
      (req.query?.recaptchaToken as string | undefined);

    if (!token) {
      res.status(400).json({ error: 'Missing CAPTCHA token' });
      return;
    }

    await verifyAndGateRecaptcha(req, res, next, expectedAction, token);
  };
}

/* ------------------------- Path-mapped variant ------------------------- */

type Rule = { method: 'GET'|'POST'|'PATCH'|'DELETE', pattern: RegExp, action: string };

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
  const path = (req.originalUrl || '').split('?')[0];
  const hit = rules.find(r => r.method === method && r.pattern.test(path));
  return hit?.action;
}

export async function recaptchaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    (req.body?.recaptchaToken as string | undefined) ||
    (req.body?.captchaToken as string | undefined);

  if (!token) {
    res.status(400).json({ error: 'Missing CAPTCHA token' });
    return;
  }

  const expectedAction = resolveExpectedAction(req);
  if (!expectedAction) {
    res.status(400).json({ error: 'Unrecognized CAPTCHA route', method: req.method, path: req.originalUrl });
    return;
  }

  await verifyAndGateRecaptcha(req, res, next, expectedAction, token);
}
