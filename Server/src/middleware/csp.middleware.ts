// Server/src/middleware/csp.middleware.ts
import type { NextFunction, Request, Response } from 'express';

export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",

      // JS: our bundle + reCAPTCHA
      // (Keep 'unsafe-inline' until you switch to nonces)
      "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",

      // CSS: local + Google Fonts stylesheet
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Images: local uploads + data/blob, gravatar, and gstatic as needed
      "img-src 'self' data: blob: https://*.gravatar.com https://www.gstatic.com",

      // Fonts: local + Google Fonts files (note: fonts.gstatic.com)
      "font-src 'self' data: https://fonts.gstatic.com",

      // XHR/fetch/websockets + reCAPTCHA Enterprise
      "connect-src 'self' https://recaptchaenterprise.googleapis.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net wss:",

      // reCAPTCHA iframes
      "frame-src https://www.google.com https://www.gstatic.com https://www.recaptcha.net",

      // Media (your uploaded videos/audio) + blobs
      "media-src 'self' data: blob:",

      // Workers (if ever used)
      "worker-src 'self' blob:",

      // App manifest
      "manifest-src 'self'",
    ].join('; ')
  );

  next();
}
