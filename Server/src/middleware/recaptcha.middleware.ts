import type { Request, Response, NextFunction } from 'express';
import { verifyRecaptchaToken } from '../services/recaptcha.service.js';

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

function patternToRegex(p: string): RegExp {
  const esc = p
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:([^/]+)/g, '[^/]+');
  return new RegExp(`^${esc}$`);
}

function stripTrailingSlash(x: string): string {
  if (x.length <= 1) return x;

  let i = x.length - 1;
  while (i > 0 && x.charCodeAt(i) === 47) {
    i--;
  }
  return x.slice(0, i + 1);
}

function normalizePaths(req: Request): string[] {
  const raw = (req.originalUrl || req.url || '').split('?')[0] || '';
  const basePlus = ((req.baseUrl || '') + (req.path || '')).split('?')[0] || '';
  const arr = [raw, basePlus, req.path || '', req.baseUrl || '']
    .filter(Boolean)
    .map(stripTrailingSlash);
  return Array.from(new Set(arr));
}

const loggedOnce = new Set<string>();

function devWarnOnce(key: string, msg: string, detail?: unknown) {
  if (process.env.NODE_ENV === 'production') return;
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  console.warn(msg, detail);
}

function makeRouteKey(req: Request): string {
  const method = (req.method || 'GET').toUpperCase();
  const routePath = (req.route?.path as string | undefined) ?? req.path ?? '';
  const raw = `${req.baseUrl || ''}${routePath || ''}`;

  const normalized = stripTrailingSlash(
    raw
      .replace(/\/\d+(\b|(?=\/))/g, '/:id')
      .replace(/:([a-zA-Z]+)Id\b/g, ':id')
      .replace(/:prayerId\b/g, ':id')
      .replace(/\/{2,}/g, '/')
  );

  return `${method} ${normalized}`;
}

const ACTION_PATTERNS: Record<string, Array<{ method: string; paths: string[] }>> = {
  comment_seen:   [{ method: 'POST', paths: ['/api/comments/seen',   '/comments/seen',   '/seen' ] }],
  comment_create: [{ method: 'POST', paths: ['/api/comments/create', '/comments/create', '/create'] }],
  comment_update: [{ method: 'PATCH', paths: ['/api/comments/:commentId', '/comments/:commentId'] }],
  comment_delete: [{ method: 'DELETE', paths: ['/api/comments/:commentId', '/comments/:commentId'] }],
  admin_event_create: [{ method: 'POST',   paths: ['/api/admin/events', '/admin/events'] }],
  admin_event_update: [{ method: 'PATCH',  paths: ['/api/admin/events/:id', '/admin/events/:id'] }],
  admin_event_delete: [{ method: 'DELETE', paths: ['/api/admin/events/:id', '/admin/events/:id'] }],
  admin_event_email: [{ method: 'POST', paths: ['/api/admin/events/:id/email', '/admin/events/:id/email', '/:id/email'] }],
};

const ROUTE_ACTIONS: Record<string, string> = {
  // AUTH
  'POST /auth/login': 'login',
  'POST /auth/register': 'register',
  'POST /auth/request-reset': 'password_reset_request',
  'POST /auth/reset-password': 'password_reset',
  'POST /admin/promote': 'admin_promote',
  'PATCH /api/admin/prayers/:id/status': 'admin_patch_status',
  'PATCH /admin/prayers/:id/status': 'admin_patch_status',
  'PATCH /api/admin/prayers/:prayerId/status': 'admin_patch_status',
  'PATCH /admin/prayers/:prayerId/status': 'admin_patch_status',
  'DELETE /api/admin/prayers/:id': 'admin_prayer_delete',
  'DELETE /admin/prayers/:id': 'admin_prayer_delete',
  'DELETE /api/admin/prayers/:prayerId': 'admin_prayer_delete',
  'DELETE /admin/prayers/:prayerId': 'admin_prayer_delete',
  'POST /export/prayers': 'export_prayers',
  'PATCH /groups': 'group_update',
  'POST /prayers': 'prayer_create',
  'PATCH /prayers/:id': 'prayer_update',
  'DELETE /prayers/:id': 'prayer_delete',
  'POST /prayers/:id/updates': 'prayer_add_update',
  'POST /prayers/:id/attachments': 'media_upload',
};

const NORMALIZED_ROUTE_ACTIONS: Record<string, string> = {
  'POST /api/admin/prayers/:id/comments': 'admin_post_comment',
  'POST /admin/prayers/:id/comments': 'admin_post_comment',
  'POST /prayers/:id/comments': 'admin_post_comment',
  'POST /api/admin/events':        'admin_event_create',
  'PATCH /api/admin/events/:id':   'admin_event_update',
  'DELETE /api/admin/events/:id':  'admin_event_delete',
  'DELETE /api/admin/prayers/:id': 'admin_prayer_delete',
  'PATCH /api/admin/prayers/:id/status': 'admin_patch_status',
  'POST /api/admin/events/:id/email': 'admin_event_email',
  'POST /admin/events/:id/email': 'admin_event_email',
  'POST /:id/email': 'admin_event_email',
};

function routeKeyCandidates(req: Request): string[] {
  const method = (req.method || 'GET').toUpperCase();

  const base = req.baseUrl || '';
  const routePath = (req.route && (req.route.path as string)) || '';
  const path = req.path || '';
  const original = req.originalUrl || '';
  const qIndex = original.indexOf('?');
  const origNoQuery = qIndex === -1 ? original : original.slice(0, qIndex);
  const origNoApi = origNoQuery.replace(/^\/api\b/, '');

  const normalizeIds = (p: string) => stripTrailingSlash(p.replace(/\/\d+(?=\/|$)/g, '/:id'));

  const set = new Set<string>([
    `${method} ${base}${routePath}`,
    `${method} ${path}`,
    `${method} ${origNoQuery}`,
    `${method} ${origNoApi}`,
    `${method} ${normalizeIds(base + routePath)}`,
    `${method} ${normalizeIds(path)}`,
    `${method} ${normalizeIds(origNoQuery)}`,
    `${method} ${normalizeIds(origNoApi)}`,
  ]);

  for (const k of Array.from(set)) {
    const [m, p] = k.split(' ');
    if (p) set.add(`${m} ${stripTrailingSlash(p)}`);
  }

  return Array.from(set).filter((k) => k.split(' ')[1]);
}


function resolveExpectedActionFromRoute(req: Request): string | null {
  const normalizedKey = makeRouteKey(req);
  if (NORMALIZED_ROUTE_ACTIONS[normalizedKey]) {
    return NORMALIZED_ROUTE_ACTIONS[normalizedKey];
  }

  for (const key of routeKeyCandidates(req)) {
    if (ROUTE_ACTIONS[key]) return ROUTE_ACTIONS[key];
  }
  return null;
}

async function verifyAndAttach(
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

    if (!result.success) {
      res.status(400).json({
        error: 'Invalid CAPTCHA token',
        errorCodes: result.errorCodes,
        action: result.action,
      });
      return;
    }

    if (!result.isActionValid) {
      res.status(400).json({
        error: 'CAPTCHA action mismatch',
        expected: expectedAction,
        got: result.action,
      });
      return;
    }

    if (!result.isScoreAcceptable) {
      res.status(403).json({ error: 'CAPTCHA score too low', score: result.score });
      return;
    }

    req.recaptcha = {
      score: result.score ?? 0,
      action: result.action ?? expectedAction,
      valid: true,
      hostname: result.hostname,
    };

    next();
  } catch (err: unknown) {
    res.status(502).json({
      error: 'reCAPTCHA verification error',
      message:
        err && typeof err === 'object' && 'message' in err
          ? String((err as any).message)
          : String(err),
    });
  }
}

export function recaptchaGuard(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.headers['x-recaptcha-token'] as string | undefined) ||
      (req.body?.recaptchaToken as string | undefined);

    const siteKey = process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;
    const projectId = process.env.RECAPTCHA_PROJECT_ID;
    if (!token || !siteKey || !projectId) return next();

    await verifyAndAttach(req, res, next, expectedAction, token);
  };
}

export async function recaptchaMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token =
    (req.headers['x-recaptcha-token'] as string | undefined) ||
    (req.body?.recaptchaToken as string | undefined);

  const actionHeader = (req.headers['x-recaptcha-action'] as string | undefined) || '';

  const siteKey = process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;
  const projectId = process.env.RECAPTCHA_PROJECT_ID;
  if (!siteKey || !projectId) return next();

  if (actionHeader && ACTION_PATTERNS[actionHeader]) {
    const method = (req.method || 'GET').toUpperCase();
    const defs = ACTION_PATTERNS[actionHeader].filter((d) => d.method.toUpperCase() === method);
    const regexes = defs.flatMap((d) => d.paths.map(patternToRegex));
    const paths = normalizePaths(req);
    const matched = regexes.some((rx) => paths.some((p) => rx.test(p)));

    if (!matched) {
      devWarnOnce(
        `${method} ${paths[0] || ''} :: ${actionHeader}`,
        '[reCAPTCHA] Unrecognized route (header-driven). Candidates:',
        defs.flatMap((d) => d.paths.map((p) => `${d.method.toUpperCase()} ${p}`))
      );

      return next();
    }

    if (!token) {
      devWarnOnce(
        `${method} ${paths[0] || ''} :: missingToken(${actionHeader})`,
        '[reCAPTCHA] Missing token for action:',
        actionHeader
      );
      return next();
    }
    await verifyAndAttach(req, res, next, actionHeader, token);
    return;
  }

  const expectedAction = resolveExpectedActionFromRoute(req);
  if (!expectedAction) {
    const candidates = [makeRouteKey(req), ...routeKeyCandidates(req)];
    devWarnOnce(
      `${req.method} ${req.originalUrl || ''} :: routeMap`,
      '[reCAPTCHA] Unrecognized route (route-map). Candidates:',
      candidates
    );

    return next();
  }

  if (!token) {
    devWarnOnce(
      `${req.method} ${req.originalUrl || ''} :: missingToken(${expectedAction})`,
      '[reCAPTCHA] Missing token for route-mapped action:',
      expectedAction
    );
    return next();
  }

  await verifyAndAttach(req, res, next, expectedAction, token);
}
