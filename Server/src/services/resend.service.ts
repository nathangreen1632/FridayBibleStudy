import { env } from '../config/env.config.js';

type SendEmailArgs = {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
};

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmailViaResend(args: SendEmailArgs): Promise<SendResult> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        reply_to: args.replyTo,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { ok: false, error: text || `Resend HTTP ${resp.status}` };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error contacting Resend' };
  }
}
