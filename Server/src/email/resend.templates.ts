// Server/src/email/templates.ts
// Purpose: centralize ALL email HTML generation so resend.service.ts stays logic-only.
// Email-safe: table layout, inline CSS, no external fonts or CSS variables.
// Colors are mapped from your app palette to fixed hex values (email clients ignore CSS vars).

export type Category =
  | 'prayer'
  | 'long-term'
  | 'salvation'
  | 'pregnancy'
  | 'birth'
  | 'praise';

/* -------------------- Palette (from index.css) -------------------- */
const COL = {
  // palette
  A: '#CCDAD1', // --c-a
  B: '#9CAEA9', // --c-b
  C: '#788585', // --c-c
  D: '#6F6866', // --c-d
  E: '#38302E', // --c-e

  // derived email choices
  BG: '#9CAEA9',         // --theme-bg  (outer background)
  SURFACE: '#CCDAD1',    // --theme-surface (card)
  TEXT: '#38302E',       // --theme-text
  ACCENT: '#38302E',     // --theme-accent
  BORDER: '#788585',     // --theme-border
  BTN_BG: '#38302E',     // --theme-button
  BTN_TEXT: '#CCDAD1',   // --theme-text-white
  ERROR: '#ef4444',      // --theme-error (not used but kept)
};

/* -------------------- Subjects -------------------- */
export function subjectForCategory(cat: Category): string {
  switch (cat) {
    case 'praise':    return 'New Praise Posted';
    case 'birth':     return 'Birth Announcement';
    case 'long-term': return 'New Long-Term Prayer';
    case 'salvation': return 'New Salvation Prayer';
    case 'pregnancy': return 'New Pregnancy Prayer';
    case 'prayer':
    default:          return 'New Prayer Posted';
  }
}

/* -------------------- Base Layout -------------------- */
/**
 * Renders a consistent, email-friendly card.
 * - `preheader` shows as preview text in inboxes (hidden in body)
 * - `bodyHtml` is your content (already escaped where needed)
 * - optional `actionText`/`actionUrl` renders a primary button
 */
function renderBase(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  actionText?: string;
  actionUrl?: string;
  footerNote?: string;
}): string {
  const { title, preheader, bodyHtml, actionText, actionUrl, footerNote } = opts;

  // Button (anchor) — email-safe
  const buttonHtml = actionText && actionUrl
    ? `
      <tr>
        <td align="center" style="padding-top: 16px; padding-bottom: 8px;">
          <a href="${actionUrl}"
             style="
               background:${COL.BTN_BG};
               color:${COL.BTN_TEXT};
               display:inline-block;
               padding:10px 16px;
               text-decoration:none;
               border-radius:12px;
               font-weight:600;
               font-size:14px;
             ">
            ${escapeHtml(actionText)}
          </a>
        </td>
      </tr>
    `
    : '';

  // Footer note (muted)
  const footer = footerNote
    ? `
      <tr>
        <td style="padding-top: 16px; font-size:12px; color:${COL.D}; line-height:1.5;">
          ${escapeHtml(footerNote)}
        </td>
      </tr>
    `
    : '';

  // Preheader (hidden preview)
  const preheaderHtml = preheader
    ? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>`
    : '';

  // Table layout for wide client support
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COL.BG};color:${COL.TEXT};">
    ${preheaderHtml}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${COL.BG};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:${COL.SURFACE};border:1px solid ${COL.BORDER};border-radius:16px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:18px 22px;border-bottom:1px solid ${COL.BORDER};">
                <div style="font-family: Inter, Arial, sans-serif; font-size:18px; line-height:1.3; font-weight:800; color:${COL.ACCENT};">
                  Friday Bible Study
                </div>
                <div style="font-family: Inter, Arial, sans-serif; font-size:14px; margin-top:4px; color:${COL.D};">
                  ${escapeHtml(title)}
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:18px 22px;">
                <div style="font-family: Inter, Arial, sans-serif; font-size:14px; line-height:1.6; color:${COL.TEXT};">
                  ${bodyHtml}
                </div>
              </td>
            </tr>

            ${buttonHtml}

            <!-- Footer -->
            <tr>
              <td style="padding:0 22px 18px 22px;">
                ${footer}
                <div style="margin-top:12px;font-family: Inter, Arial, sans-serif; font-size:11px; color:${COL.C};">
                  © ${new Date().getFullYear()} Friday Bible Study
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

/* -------------------- Public/Group Notifications -------------------- */
export function renderGroupCategoryHtml(opts: {
  category: Category;
  title: string;
  description: string;
  createdByName?: string;
  linkUrl?: string;
}): string {
  const subject = subjectForCategory(opts.category);

  const pieces: string[] = [];
  pieces.push(`<h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${COL.ACCENT};">${escapeHtml(subject)}</h2>`);
  pieces.push(`<p style="margin:0 0 4px 0;"><strong>Title:</strong> ${escapeHtml(opts.title)}</p>`);
  if (opts.createdByName) {
    pieces.push(`<p style="margin:0 0 8px 0;"><strong>Posted by:</strong> ${escapeHtml(opts.createdByName)}</p>`);
  }
  pieces.push(`<div style="margin:12px 0;white-space:pre-wrap;">${escapeHtml(opts.description)}</div>`);

  const bodyHtml = pieces.join('\n');

  return renderBase({
    title: subject,
    preheader: `${opts.title}`,
    bodyHtml,
    actionText: opts.linkUrl ? 'View in Friday Bible Study' : undefined,
    actionUrl: opts.linkUrl,
  });
}

/* -------------------- Admin Notifications -------------------- */
export function renderAdminCategoryHtml(opts: {
  category: Category;
  title: string;
  description: string;
  createdByName?: string;
  linkUrl?: string;
}): { subject: string; html: string } {
  const core = subjectForCategory(opts.category);
  const subject = `[Admin] ${core}`;

  const parts: string[] = [];
  parts.push(`<h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${COL.ACCENT};">${escapeHtml(core)}</h2>`);
  parts.push(`<p style="margin:0 0 4px 0;"><strong>Category:</strong> ${escapeHtml(opts.category)}</p>`);
  parts.push(`<p style="margin:0 0 4px 0;"><strong>Title:</strong> ${escapeHtml(opts.title)}</p>`);
  if (opts.createdByName) {
    parts.push(`<p style="margin:0 0 8px 0;"><strong>Posted by:</strong> ${escapeHtml(opts.createdByName)}</p>`);
  }
  parts.push(`<div style="margin:12px 0;white-space:pre-wrap;">${escapeHtml(opts.description)}</div>`);

  const html = renderBase({
    title: subject,
    preheader: `${opts.title}`,
    bodyHtml: parts.join('\n'),
    actionText: opts.linkUrl ? 'Open in Friday Bible Study' : undefined,
    actionUrl: opts.linkUrl,
    footerNote: 'You are receiving this notification because you are an administrator.',
  });

  return { subject, html };
}

/* -------------------- Contact Form -------------------- */
export function renderContactHtml(opts: {
  name: string;
  email: string;
  message: string;
}): { subject: string; html: string } {
  const subject = `[Contact] ${opts.name}`;

  const html = renderBase({
    title: 'New Contact Form Submission',
    preheader: `${opts.name} — ${opts.email}`,
    bodyHtml: `
      <p style="margin:0 0 6px 0;"><strong>Name:</strong> ${escapeHtml(opts.name)}</p>
      <p style="margin:0 0 6px 0;"><strong>Email:</strong> ${escapeHtml(opts.email)}</p>
      <div style="margin:12px 0;white-space:pre-wrap;">${escapeHtml(opts.message)}</div>
    `,
    footerNote: 'Reply directly to this email to continue the conversation.',
  });

  return { subject, html };
}

// -------------------- Digest (Weekly/Periodic) --------------------
export function renderDigestEmailHtml(opts: {
  groupName: string;
  updates: Array<{
    prayerTitle: string;
    authorName: string;
    content: string;
    createdAt: Date | string | number;
  }>;
  periodLabel?: string;   // e.g., "Last 7 Days"
  actionUrl?: string;     // optional deep link
}): string {
  const { groupName, updates, periodLabel, actionUrl } = opts;

  // Local safe date -> string
  function toDateSafeLocal(input: unknown): Date {
    try {
      const d = new Date(String(input));
      if (Number.isNaN(d.getTime())) return new Date();
      return d;
    } catch {
      return new Date();
    }
  }

  const rows = updates
    .map((u) => {
      const ts = toDateSafeLocal(u.createdAt).toLocaleString();
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid ${COL.BORDER};">
            <div style="font-weight:600;margin:0 0 4px 0;">${escapeHtml(u.prayerTitle)}</div>
            <div style="opacity:.8;font-size:12px;margin:0 0 8px 0;">${escapeHtml(u.authorName)} • ${escapeHtml(ts)}</div>
            <div style="margin-top:6px;white-space:pre-wrap;line-height:1.5;">${escapeHtml(u.content)}</div>
          </td>
        </tr>`;
    })
    .join('');

  const tableHtml = `
    <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:800;color:${COL.ACCENT};">
      ${escapeHtml(groupName)} • Prayer Digest${periodLabel ? ` — ${escapeHtml(periodLabel)}` : ''}
    </h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      ${rows || '<tr><td style="padding:16px;">No updates in this period.</td></tr>'}
    </table>
    <div style="margin-top:12px;font-size:12px;opacity:.8;line-height:1.5;">
      You’re receiving this because you’re a member of ${escapeHtml(groupName)}. Reply to this email to keep the conversation going.
    </div>
  `;

  const preheader =
    updates.length > 0
      ? `${updates.length} update${updates.length === 1 ? '' : 's'} in the recent period.`
      : 'No updates in the recent period.';

  return renderBase({
    title: `${groupName} • Prayer Digest${periodLabel ? ` (${periodLabel})` : ''}`,
    preheader,
    bodyHtml: tableHtml,
    actionText: actionUrl ? 'Open in Friday Bible Study' : undefined,
    actionUrl,
  });
}


/* -------------------- Utilities -------------------- */
function escapeHtml(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
