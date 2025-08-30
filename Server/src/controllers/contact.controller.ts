import type { Request, Response } from 'express';
import { env } from '../config/env.config.js';
import { sendEmailViaResend } from '../services/resend.service.js';

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

  const safe = (s: string) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 12px 0;">New Contact Message</h2>
      <p><strong>Name:</strong> ${safe(name)}</p>
      <p><strong>Email:</strong> ${safe(email)}</p>
      <p><strong>Message:</strong><br/>${safe(message).replace(/\n/g, '<br/>')}</p>
    </div>
  `;

  const result = await sendEmailViaResend({
    to: env.GROUP_EMAIL,
    from: env.EMAIL_FROM,
    subject: 'Friday Bible Study — Contact Form',
    html,
    replyTo: email,
  });

  if (!result.ok) {
    res.status(502).json({ ok: false, error: result.error });
    return;
  }

  res.json({ ok: true });
}
