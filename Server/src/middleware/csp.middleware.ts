import type { NextFunction, Request, Response } from 'express';

export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  // Single, explicit CSP header. Keep it simple & allow what we actually use.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",

      // JS: our own bundle + reCAPTCHA loaders. No 'strict-dynamic' (it can suppress host allowlists).
      "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",

      // CSS: Tailwind sometimes inlines styles in dev; keep 'unsafe-inline' for safety.
      "style-src 'self' 'unsafe-inline'",

      // Images & fonts (vite assets may use data: / blob:)
      "img-src 'self' data: blob: https://www.gstatic.com",
      "font-src 'self' data: https://www.gstatic.com",

      // XHR/fetch/websockets + reCAPTCHA Enterprise endpoint
      "connect-src 'self' https://recaptchaenterprise.googleapis.com https://www.google.com https://www.gstatic.com wss:",

      // reCAPTCHA iframes
      "frame-src https://www.google.com https://www.gstatic.com https://www.recaptcha.net",

      // app manifest (harmless to allow)
      "manifest-src 'self'",
    ].join('; ')
  );

  next();
}
