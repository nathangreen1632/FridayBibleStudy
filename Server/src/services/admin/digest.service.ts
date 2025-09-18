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

export async function sendDigest(params: {
  groupId: number;
  createdById: number;
  updates: DigestUpdate[];
  subject?: string;
  replyTo?: string;
  threadMessageId?: string | null;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    let grp: Group | null = null;
    try {
      grp = await Group.findByPk(params.groupId);
    } catch {
      return { ok: false, error: 'Group lookup failed.' };
    }
    if (!grp) return { ok: false, error: 'Group not found.' };

    const fallbackGroupAddress = 'group@fridaybiblestudy.org';
    const groupAddressRaw = (grp as any)?.groupEmail;
    const groupAddress =
      typeof groupAddressRaw === 'string' && groupAddressRaw.includes('@')
        ? groupAddressRaw
        : fallbackGroupAddress;

    let ccEmails: string[] = [];

    try {
      const members = await GroupMember.findAll({
        where: { groupId: params.groupId },
        include: [
          {
            model: User,
            as: 'user',
            required: true,
            where: { emailPaused: false },
            attributes: ['email'],
          },
        ],
        limit: 5000,
      });

      ccEmails = members
        .map((m: any) => m?.user?.email)
        .filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'));
    } catch {

    }

    if (!ccEmails.length) {
      try {
        const users = await User.findAll({
          where: { emailPaused: false },
          attributes: ['email', 'emailPaused'],
          limit: 5000,
        });

        ccEmails = users
          .filter((u: any) => !u?.emailPaused)
          .map((u: any) => u?.email)
          .filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'));
      } catch {
        return { ok: false, error: 'User email lookup failed.' };
      }
    }

    const dedup = Array.from(new Set(ccEmails))
      .filter((e) => e.toLowerCase() !== String(groupAddress).toLowerCase())
      .slice(0, 95);

    if (!dedup.length) {
      return { ok: false, error: 'No recipients: users table has no valid emails.' };
    }

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
    });

    try {
      await sendEmail({
        from: groupAddress,
        to: dedup,
        cc: groupAddress,
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
