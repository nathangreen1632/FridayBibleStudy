import type { NextFunction, Request, Response } from 'express';

export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.gravatar.com https://www.gstatic.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://recaptchaenterprise.googleapis.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net wss:",
      "frame-src https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
      "media-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ')
  );

  next();
}
