import { Resend } from 'resend';
import { env } from '../config/env.config.js';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<void> {
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments
  });
}
