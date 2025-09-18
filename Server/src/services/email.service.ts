import { Resend } from 'resend';
import { env } from '../config/env.config.js';

const resend = new Resend(env.RESEND_API_KEY);

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
};

export async function sendEmail(opts: SendEmailParams): Promise<void> {
  const payload: any = {
    from: opts.from ?? env.EMAIL_FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
  };

  if (opts.cc)       payload.cc       = opts.cc;
  if (opts.bcc)      payload.bcc      = opts.bcc;
  if (opts.replyTo)  payload.reply_to = opts.replyTo;
  if (opts.headers)  payload.headers  = opts.headers;
  if (opts.attachments) payload.attachments = opts.attachments;

  await resend.emails.send(payload);
}
