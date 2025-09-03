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

/** ----------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------*/

// Convert a pattern like "/comments/:commentId" to a safe regex
function patternToRegex(p: string): RegExp {
  const esc = p
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex chars
    .replace(/\\:([^/]+)/g, '[^/]+');       // replace :param with [^/]+
  return new RegExp(`^${esc}$`);
}

function stripTrailingSlash(x: string): string {
  if (x.length <= 1) return x;

  let i = x.length - 1;
  // 47 = "/"
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
  // ensure unique order
  return Array.from(new Set(arr));
}

const loggedOnce = new Set<string>();

function devWarnOnce(key: string, msg: string, detail?: unknown) {
  if (process.env.NODE_ENV === 'production') return;
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  // eslint-disable-next-line no-console
  console.warn(msg, detail);
}

/** ----------------------------------------------------------------------------
 * Path-alias patterns (header-driven) for comments actions
 * ---------------------------------------------------------------------------*/

const ACTION_PATTERNS: Record<string, Array<{ method: string; paths: string[] }>> = {
  comment_seen:   [{ method: 'POST', paths: ['/api/comments/seen',   '/comments/seen',   '/seen' ] }],
  comment_create: [{ method: 'POST', paths: ['/api/comments/create', '/comments/create', '/create'] }],
  comment_update: [{ method: 'PATCH', paths: ['/api/comments/:commentId', '/comments/:commentId'] }],
  comment_delete: [{ method: 'DELETE', paths: ['/api/comments/:commentId', '/comments/:commentId'] }],
};

/** ----------------------------------------------------------------------------
 * Legacy route→action resolution (fallback for existing endpoints)
 * ---------------------------------------------------------------------------*/

// Map “METHOD path” → Enterprise action (works with your existing routes)
const ROUTE_ACTIONS: Record<string, string> = {
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
  const method = (req.method || 'GET').toUpperCase();

  const base = req.baseUrl || ''; // e.g. "/auth"
  const routePath = (req.route && (req.route.path as string)) || ''; // e.g. "/login" or "/:id/updates"
  const path = req.path || ''; // e.g. "/auth/login"
  const original = req.originalUrl || '';
  const qIndex = original.indexOf('?');
  const origNoQuery = qIndex === -1 ? original : original.slice(0, qIndex);
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

function resolveExpectedActionFromRoute(req: Request): string | null {
  for (const key of routeKeyCandidates(req)) {
    if (ROUTE_ACTIONS[key]) return ROUTE_ACTIONS[key];
  }
  return null;
}

/** ----------------------------------------------------------------------------
 * Shared verifier (graceful, no throws)
 * ---------------------------------------------------------------------------*/

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

    // 1) Token must be verified by Google
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid CAPTCHA token',
        errorCodes: result.errorCodes,
        action: result.action,
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
  } catch (err: unknown) {
    res.status(502).json({
      error: 'reCAPTCHA verification error',
      message: (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err),
    });
  }
}

/** ----------------------------------------------------------------------------
 * Public middlewares
 * ---------------------------------------------------------------------------*/

/** Guard when you want to name the action inline on a route */
export function recaptchaGuard(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.headers['x-recaptcha-token'] as string | undefined) ||
      (req.body?.recaptchaToken as string | undefined);

    // In dev (or when not configured), soft-bypass to keep DX smooth
    const siteKey = process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;
    const projectId = process.env.RECAPTCHA_PROJECT_ID;
    if (!token || !siteKey || !projectId) return next();

    await verifyAndAttach(req, res, next, expectedAction, token);
  };
}

/**
 * Smart reCAPTCHA middleware.
 * - If client sends `x-recaptcha-action`, try to match against ACTION_PATTERNS (header-driven).
 * - Otherwise, fall back to legacy route→action resolution (ROUTE_ACTIONS).
 */
export async function recaptchaMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token =
    (req.headers['x-recaptcha-token'] as string | undefined) ||
    (req.body?.recaptchaToken as string | undefined);

  const actionHeader = (req.headers['x-recaptcha-action'] as string | undefined) || '';

  // Soft-bypass in dev or if reCAPTCHA not configured
  const siteKey = process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;
  const projectId = process.env.RECAPTCHA_PROJECT_ID;
  if (!siteKey || !projectId) return next();

  // If we have an action header that we recognize, use path-alias matching
  if (actionHeader && ACTION_PATTERNS[actionHeader]) {
    const method = (req.method || 'GET').toUpperCase();
    const defs = ACTION_PATTERNS[actionHeader].filter(d => d.method.toUpperCase() === method);
    const regexes = defs.flatMap(d => d.paths.map(patternToRegex));
    const paths = normalizePaths(req);
    const matched = regexes.some(rx => paths.some(p => rx.test(p)));

    if (!matched) {
      devWarnOnce(
        `${method} ${paths[0] || ''} :: ${actionHeader}`,
        '[reCAPTCHA] Unrecognized route (header-driven). Candidates:',
        defs.flatMap(d => d.paths.map(p => `${d.method.toUpperCase()} ${p}`))
      );
      // Soft-allow (don’t block) to avoid dev noise
      return next();
    }

    // Matched header-driven route; verify if we have a token, else soft-allow
    if (!token) {
      devWarnOnce(`${method} ${paths[0] || ''} :: missingToken(${actionHeader})`, '[reCAPTCHA] Missing token for action:', actionHeader);
      return next();
    }
    return void (await verifyAndAttach(req, res, next, actionHeader, token));
  }

  // Fallback: resolve from route mapping (legacy endpoints)
  const expectedAction = resolveExpectedActionFromRoute(req);
  if (!expectedAction) {
    devWarnOnce(
      `${req.method} ${req.originalUrl || ''} :: routeMap`,
      '[reCAPTCHA] Unrecognized route (route-map). Candidates:',
      routeKeyCandidates(req)
    );
    // Soft-allow in dev
    return next();
  }

  if (!token) {
    devWarnOnce(`${req.method} ${req.originalUrl || ''} :: missingToken(${expectedAction})`, '[reCAPTCHA] Missing token for route-mapped action:', expectedAction);
    return next();
  }

  await verifyAndAttach(req, res, next, expectedAction, token);
}
