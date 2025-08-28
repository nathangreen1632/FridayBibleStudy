import {randomBytes} from 'crypto';
import type {NextFunction, Request, Response} from 'express';

export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  (res.locals as any).nonce = randomBytes(16).toString('base64');

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' https://www.google.com https://www.gstatic.com 'strict-dynamic'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://www.gstatic.com",
    "font-src 'self' data: https://www.gstatic.com",
    "frame-src https://www.google.com https://www.gstatic.com",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; '));

  next();
}
