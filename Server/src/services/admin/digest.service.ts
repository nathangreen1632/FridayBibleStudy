import { Op } from 'sequelize';
import { Comment, Prayer, Group, GroupMember, User } from '../../models/index.js';
import { sendEmail } from '../email.service.js';

type DigestUpdate = {
  id: number;
  prayerId: number;
  prayerTitle: string;
  authorName: string;
  content: string;
  createdAt: Date;
};

/**
 * Collect last N days of ROOT comments only (depth = 0), scoped to a group.
 * Matches ERD: comments(prayerId, depth, authorUserId, content, createdAt) ←→ prayers(groupId)
 */
export async function collectUpdatesLastNDays(
  groupId: number,
  days: number
): Promise<DigestUpdate[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const updates = await Comment.findAll({
      include: [
        {
          model: Prayer,
          as: 'prayer',
          attributes: ['id', 'title', 'groupId'],
          where: { groupId },
          required: true,
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      where: {
        depth: 0,               // root-only per your commentCount “root-only” rebase
        createdAt: { [Op.gte]: since },
        deletedAt: { [Op.is]: null }, // ignore soft-deleted if you use paranoid
      },
      order: [['createdAt', 'DESC']],
      limit: 1000,
    });

    return updates.map((u) => ({
      id: u.id,
      prayerId: u.prayerId,
      prayerTitle: (u as any).prayer?.title ?? 'Untitled',
      authorName: (u as any).author?.name ?? 'Unknown',
      content: u.content,
      createdAt: u.createdAt,
    }));
  } catch {
    return [];
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderDigestHtml(groupName: string, updates: DigestUpdate[]): string {
  const items = updates
    .map((u) => {
      const ts = new Date(u.createdAt).toLocaleString();
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;">${escapeHtml(u.prayerTitle)}</div>
            <div style="opacity:.8;font-size:12px;">${escapeHtml(u.authorName)} • ${ts}</div>
            <div style="margin-top:6px;white-space:pre-wrap;">${escapeHtml(u.content)}</div>
          </td>
        </tr>`;
    })
    .join('');

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f5f5f4;padding:16px;color:#111827;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="padding:16px;background:#e5e7eb;font-weight:800;">${escapeHtml(
    groupName
  )} • Prayer Digest</div>
        <table style="width:100%;border-collapse:collapse;">${
    items || '<tr><td style="padding:16px;">No updates in this period.</td></tr>'
  }</table>
        <div style="padding:12px;font-size:12px;opacity:.75;">
          You’re receiving this because you’re a member of ${escapeHtml(
    groupName
  )}. Reply to this email to keep the conversation going.
        </div>
      </div>
    </div>`;
}

/**
 * Send the digest to all emails in groupMembers for the group.
 * replyTo uses groups.groupEmail (ERD column) so replies form a thread in that mailbox.
 * We also accept optional thread headers if you later want to stitch threads.
 */
export async function sendDigest(params: {
  groupId: number;
  createdById: number;
  updates: DigestUpdate[];
  subject?: string;
  replyTo?: string;              // accepted by our function, but email.service does not use it
  threadMessageId?: string | null; // accepted by our function, but email.service does not use it
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const grp = await Group.findByPk(params.groupId);
    if (!grp) return { ok: false, error: 'Group not found.' };

    // recipients from groupMembers → users.email
    const members = await GroupMember.findAll({
      where: { groupId: params.groupId },
      include: [{ model: User, as: 'user', attributes: ['email', 'name'] }],
    });

    const recipients = members
      .map((m: any) => m.user?.email)
      .filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'));

    // subject (independent statement; no nested ternaries)
    let subject: string;
    if (typeof params.subject === 'string' && params.subject.trim().length > 0) {
      subject = params.subject;
    } else {
      subject = `${grp.name} • Prayer Digest (Last 7 Days)`;
    }

    // html body
    const html = renderDigestHtml(grp.name, params.updates);

    // NOTE: Your email.service signature does NOT accept from/replyTo/headers and returns void.
    // If you later extend it, we can pass replyTo/headers here. For now, keep to the allowed shape.
    // sendEmail(to, subject, html, attachments?)
    try {
      // fire-and-forget; service returns void
      await sendEmail({
        to: recipients,
        subject,
        html,
      });
    } catch {
      // email transport error -> soft error
      return { ok: false, error: 'Send failed.' };
    }

    // We don’t have a transport id to return (sendEmail returns void)
    return { ok: true };
  } catch {
    return { ok: false, error: 'Digest send error.' };
  }
}
