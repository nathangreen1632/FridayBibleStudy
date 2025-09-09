// Server/src/services/admin/digest.service.ts
import { Op } from 'sequelize';
import { Comment, Group, GroupMember, Prayer, PrayerUpdate, User } from '../../models/index.js';
import { sendEmail } from '../email.service.js';
import { renderDigestEmailHtml } from '../../email/resend.templates.js';

type DigestUpdate = {
  id: number;
  prayerId: number;
  prayerTitle: string;
  authorName: string;
  content: string;
  createdAt: Date;
};

function toDateSafe(input: unknown): Date {
  try {
    const d = new Date(String(input));
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  } catch {
    return new Date();
  }
}

/**
 * Collect last N days of updates for a group.
 * Sources:
 *  - prayerUpdates (joined through prayers -> groupId)
 *  - comments (root-only: depth = 0; joined through prayers -> groupId)
 */
export async function collectUpdatesLastNDays(
  groupId: number,
  days: number
): Promise<DigestUpdate[]> {
  if (!groupId || !days || days < 1) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const updates = await PrayerUpdate.findAll({
      where: { createdAt: { [Op.gte]: since } },
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
      order: [['createdAt', 'DESC']],
      limit: 1000,
    });

    const comments = await Comment.findAll({
      where: {
        depth: 0,
        createdAt: { [Op.gte]: since },
        deletedAt: { [Op.is]: null },
      },
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
      order: [['createdAt', 'DESC']],
      limit: 1000,
    });

    const mappedUpdates: DigestUpdate[] = updates.map((u: any) => ({
      id: Number(u.id),
      prayerId: Number(u.prayerId ?? u.prayer?.id ?? 0),
      prayerTitle: String(u.prayer?.title ?? 'Untitled'),
      authorName: String(u.author?.name ?? 'Unknown Author'),
      content: String(u.content ?? ''),
      createdAt: toDateSafe(u.createdAt),
    }));

    const mappedComments: DigestUpdate[] = comments.map((c: any) => ({
      id: Number(c.id),
      prayerId: Number(c.prayerId ?? c.prayer?.id ?? 0),
      prayerTitle: String(c.prayer?.title ?? 'Untitled'),
      authorName: String(c.author?.name ?? 'Unknown Author'),
      content: String(c.content ?? ''),
      createdAt: toDateSafe(c.createdAt),
    }));

    return [...mappedUpdates, ...mappedComments].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Send the digest to all emails in groupMembers for the group.
 * Uses CC so recipients can "Reply all" and form an email thread.
 */
export async function sendDigest(params: {
  groupId: number;
  createdById: number;
  updates: DigestUpdate[];
  subject?: string;
  replyTo?: string;
  threadMessageId?: string | null;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    // 1) Load group (for name and optional groupEmail)
    let grp: Group | null = null;
    try {
      grp = await Group.findByPk(params.groupId);
    } catch {
      return { ok: false, error: 'Group lookup failed.' };
    }
    if (!grp) return { ok: false, error: 'Group not found.' };

    // 2) Decide sender/visible To/reply-to
    const fallbackGroupAddress = 'group@fridaybiblestudy.org';
    const groupAddressRaw = (grp as any)?.groupEmail;
    const groupAddress =
      typeof groupAddressRaw === 'string' && groupAddressRaw.includes('@')
        ? groupAddressRaw
        : fallbackGroupAddress;

    // 3) Build CC list from USERS in the group (fallback to all users)
    let ccEmails: string[] = [];

    try {
      const members = await GroupMember.findAll({
        where: { groupId: params.groupId },
        include: [{ model: User, as: 'user', attributes: ['email'] }],
        limit: 5000,
      });

      ccEmails = members
        .map((m: any) => m?.user?.email)
        .filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'));
    } catch {
      // ignore; fallback below
    }

    if (!ccEmails.length) {
      try {
        const users = await User.findAll({ attributes: ['email'], limit: 5000 });
        ccEmails = users
          .map((u: any) => u?.email)
          .filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'));
      } catch {
        return { ok: false, error: 'User email lookup failed.' };
      }
    }

    // 3c) de-dup, exclude the group address itself, and cap to a safe limit
    const dedup = Array.from(new Set(ccEmails))
      .filter((e) => e.toLowerCase() !== String(groupAddress).toLowerCase())
      .slice(0, 95); // safe headroom under typical 100-recipient per-field limits

    if (!dedup.length) {
      return { ok: false, error: 'No recipients: users table has no valid emails.' };
    }

    // 4) Subject + HTML
    const subject =
      typeof params.subject === 'string' && params.subject.trim().length > 0
        ? params.subject
        : `${grp.name} • Prayer Digest (Last 7 Days)`;

    const html = renderDigestEmailHtml({
      groupName: grp.name,
      updates: params.updates.map((u) => ({
        prayerTitle: u.prayerTitle,
        authorName: u.authorName,
        content: u.content,
        createdAt: u.createdAt,
      })),
      periodLabel: 'Last 7 Days',
      // actionUrl: 'https://your-app.example.com/groups/...' // optional deep link
    });

    // 5) Send the email via Resend
    //    From = group mailbox (so recipients see group@)
    //    To   = group mailbox (so the group inbox keeps a copy)
    //    CC   = all recipients (so "Reply all" threads the conversation)
    //    Reply-To = group mailbox (so replies go back to group@)
    try {
      await sendEmail({
        from: groupAddress,
        to: dedup,                // all user emails are direct recipients
        cc: groupAddress,         // group inbox just copied
        replyTo: params.replyTo?.includes('@') ? params.replyTo : groupAddress,
        subject,
        html,
      });
    } catch {
      return { ok: false, error: 'Send failed.' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Digest send error.' };
  }
}
