// Server/src/controllers/contact.controller.ts
import type { Request, Response } from 'express';
import { notifyAdminOnContact } from '../services/resend.service.js';

export async function submitContact(req: Request, res: Response): Promise<void> {
  const { name, email, message } = (req.body ?? {}) as {
    name?: string; email?: string; message?: string;
  };

  if (!name || !email || !message) {
    res.status(400).json({ ok: false, error: 'Missing name, email, or message' });
    return;
  }

  // Optional: gate on recaptcha validation result if your middleware sets it
  if (req.recaptcha && !req.recaptcha.valid) {
    res.status(403).json({ ok: false, error: 'Failed human verification' });
    return;
  }

  const result = await notifyAdminOnContact({ name, email, message });

  if (!result.ok) {
    res.status(502).json({ ok: false, error: result.error });
    return;
  }

  res.json({ ok: true });
}
