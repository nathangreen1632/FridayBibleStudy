import type { Request, Response, NextFunction } from 'express';

// Placeholder: enforce presence of token but skip remote call in dev.
// You can add real Enterprise verification later.
export function recaptchaRequired(actionName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = (req.headers['x-recaptcha-token'] as string) ?? (req.body?.recaptchaToken as string);
    if (!token) { res.status(400).json({ error: `Missing reCAPTCHA token for ${actionName}` }); return; }
    next();
  };
}
