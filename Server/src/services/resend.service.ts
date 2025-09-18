import { env } from '../config/env.config.js';
import {
  type Category as PrayerCategory,
  subjectForCategory,
  renderGroupCategoryHtml,
  renderAdminCategoryHtml,
  renderContactHtml,
} from '../email/resend.templates.js';

type SendEmailArgs = {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

type SendResult = { ok: true } | { ok: false; error: string };

const ADDR = {
  defaultFrom: 'no-reply@fridaybiblestudy.org',
  fromPrayers: 'prayers@fridaybiblestudy.org',
  fromPraises: 'praises@fridaybiblestudy.org',
  group: 'group@fridaybiblestudy.org',
  admin: 'admin@fridaybiblestudy.org',
  auditCc: 'msbourne60@fridaybiblestudy.org',
};

const EMAIL_FROM_DEFAULT = env.EMAIL_FROM || ADDR.defaultFrom;
const GROUP_EMAIL = env.GROUP_EMAIL || ADDR.group;
const ADMIN_EMAIL = env.ADMIN_EMAIL || ADDR.admin;
const AUDIT_CC = env.AUDIT_CC || ADDR.auditCc;

function fromForCategory(cat: PrayerCategory): string {
  if (cat === 'praise' || cat === 'birth') return ADDR.fromPraises;
  return ADDR.fromPrayers; // prayer | long-term | salvation | pregnancy
}

export async function sendEmailViaResend(args: SendEmailArgs): Promise<SendResult> {
  try {
    let cc: string[] | undefined;
    if (args.cc) {
      cc = Array.isArray(args.cc) ? args.cc : [args.cc];
    } else {
      cc = [AUDIT_CC];
    }

    let bcc: string[] | undefined;
    if (args.bcc) {
      bcc = Array.isArray(args.bcc) ? args.bcc : [args.bcc];
    } else {
      bcc = undefined;
    }

    const payload = {
      from: args.from || EMAIL_FROM_DEFAULT,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      reply_to: args.replyTo,
      cc,
      bcc,
    };

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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

export async function notifyGroupOnCategoryCreate(opts: {
  category: PrayerCategory;
  title: string;
  description: string;
  createdByName?: string;
  linkUrl?: string;
}): Promise<SendResult> {
  const from = fromForCategory(opts.category);
  const subject = subjectForCategory(opts.category);
  const html = renderGroupCategoryHtml(opts);

  return sendEmailViaResend({
    from,
    to: GROUP_EMAIL,
    subject,
    html,
    cc: AUDIT_CC,
  });
}

export async function notifyAdminOnCategoryCreate(opts: {
  category: PrayerCategory;
  title: string;
  description: string;
  createdByName?: string;
  linkUrl?: string;
}): Promise<SendResult> {
  const { subject, html } = renderAdminCategoryHtml(opts);

  return sendEmailViaResend({
    from: EMAIL_FROM_DEFAULT,
    to: ADMIN_EMAIL,
    subject,
    html,
    cc: AUDIT_CC,
  });
}

export async function notifyAdminOnContact(opts: {
  name: string;
  email: string;
  message: string;
}): Promise<SendResult> {
  const { subject, html } = renderContactHtml(opts);

  return sendEmailViaResend({
    from: EMAIL_FROM_DEFAULT,
    to: ADMIN_EMAIL,
    subject,
    html,
    replyTo: opts.email,
    cc: AUDIT_CC,
  });
}
