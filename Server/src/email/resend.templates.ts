// Server/src/email/templates.ts
// Purpose: centralize ALL email HTML generation so resend.service.ts stays logic-only.

export type Category =
  | 'prayer'
  | 'long-term'
  | 'salvation'
  | 'pregnancy'
  | 'birth'
  | 'praise';

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

/** Group email body when an item is created in any category. */
export function renderGroupCategoryHtml(opts: {
  category: Category;
  title: string;
  description: string;
  createdByName?: string;
  linkUrl?: string;
}): string {
  const subject = subjectForCategory(opts.category);
  return `
    <div style="font-family: Inter, Arial, sans-serif">
      <h2 style="margin:0 0 8px 0">${escapeHtml(subject)}</h2>
      <p style="margin:0 0 4px 0"><strong>Title:</strong> ${escapeHtml(opts.title)}</p>
      ${opts.createdByName ? `<p style="margin:0 0 4px 0"><strong>Posted by:</strong> ${escapeHtml(opts.createdByName)}</p>` : ''}
      <p style="white-space:pre-wrap; margin:12px 0">${escapeHtml(opts.description)}</p>
      ${opts.linkUrl ? `<p><a href="${opts.linkUrl}">View in Friday Bible Study</a></p>` : ''}
    </div>
  `;
}

/** Admin email body when an item is created (includes category label). */
export function renderAdminCategoryHtml(opts: {
  category: Category;
  title: string;
  description: string;
  createdByName?: string;
  linkUrl?: string;
}): { subject: string; html: string } {
  const core = subjectForCategory(opts.category);
  const subject = `[Admin] ${core}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif">
      <h2 style="margin:0 0 8px 0">${escapeHtml(subject)}</h2>
      <p><strong>Category:</strong> ${escapeHtml(opts.category)}</p>
      <p><strong>Title:</strong> ${escapeHtml(opts.title)}</p>
      ${opts.createdByName ? `<p><strong>Posted by:</strong> ${escapeHtml(opts.createdByName)}</p>` : ''}
      <p style="white-space:pre-wrap; margin:12px 0">${escapeHtml(opts.description)}</p>
      ${opts.linkUrl ? `<p><a href="${opts.linkUrl}">View in Friday Bible Study</a></p>` : ''}
    </div>
  `;
  return { subject, html };
}

/** Admin email body for Contact form. */
export function renderContactHtml(opts: {
  name: string;
  email: string;
  message: string;
}): { subject: string; html: string } {
  const subject = `[Contact] ${opts.name}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif">
      <h2 style="margin:0 0 8px 0">New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(opts.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(opts.email)}</p>
      <p style="white-space:pre-wrap; margin:12px 0">${escapeHtml(opts.message)}</p>
    </div>
  `;
  return { subject, html };
}

/** Tiny HTML escape for safe interpolation in templates. */
function escapeHtml(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
