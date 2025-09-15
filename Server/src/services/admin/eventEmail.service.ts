// Server/src/services/admin/eventEmail.service.ts
import { Event, Group, GroupMember, User } from '../../models/index.js';
import { sendEmail } from '../email.service.js';
import { renderEventEmailHtml } from '../../email/resend.templates.js';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && v.includes('@');
}

export async function loadEventById(id: number): Promise<Result<Event>> {
  try {
    const row = await Event.findByPk(id);
    if (!row) return { ok: false, error: 'Event not found.' };
    return { ok: true, data: row };
  } catch {
    return { ok: false, error: 'Event lookup failed.' };
  }
}

export async function computeRecipients(groupId: number): Promise<{ to: string[]; cc: string[]; groupAddress?: string }> {
  let groupAddress: string | undefined;
  try {
    const grp = await Group.findByPk(groupId);
    if (grp?.groupEmail && isEmail(grp.groupEmail)) {
      groupAddress = grp.groupEmail;
    }
  } catch {
    // ignore; groupAddress stays undefined
  }

  // TO: all active member emails (emailPaused = false)
  let to: string[] = [];
  try {
    const members = await GroupMember.findAll({
      where: { groupId },
      include: [
        {
          model: User,
          as: 'user',
          required: true,
          where: { emailPaused: false },
          attributes: ['email', 'emailPaused'],
        },
      ],
      limit: 5000,
    });

    to = members
      .map((m: any) => m?.user?.email)
      .filter(isEmail);
  } catch {
    // fallback: all users (paused filtered in app)
    try {
      const users = await User.findAll({
        where: { emailPaused: false },
        attributes: ['email', 'emailPaused'],
        limit: 5000,
      });
      to = users.filter((u: any) => !u?.emailPaused).map((u: any) => u?.email).filter(isEmail);
    } catch {
      // last resort: no recipients
      to = [];
    }
  }

  // CC: all admins (emailPaused = false), plus groupAddress (if present)
  let cc: string[] = [];
  try {
    const admins = await User.findAll({
      where: { role: 'admin', emailPaused: false } as any,
      attributes: ['email'],
      limit: 500,
    });
    cc = admins.map((u: any) => u?.email).filter(isEmail);
  } catch {
    cc = [];
  }

  if (groupAddress && !cc.includes(groupAddress)) {
    cc.push(groupAddress);
  }

  // de-dup TO and CC; also make sure we don’t duplicate the group address in TO
  const dedup = (arr: string[]) => Array.from(new Set(arr));
  const toSet = new Set(dedup(to).filter((e) => e !== groupAddress));
  const ccSet = new Set(dedup(cc).filter((e) => !toSet.has(e)));

  return { to: Array.from(toSet), cc: Array.from(ccSet), groupAddress };
}

export async function sendEventEmail(params: { eventId: number; requestedById: number }): Promise<{ ok: boolean; error?: string }> {
  const eventRes = await loadEventById(params.eventId);
  if (!eventRes.ok) return { ok: false, error: eventRes.error || 'Event lookup failed.' };
  const ev = eventRes.data;

  const { to, cc, groupAddress } = await computeRecipients(ev.groupId);

  if (!to.length && !cc.length) {
    return { ok: false, error: 'No valid recipients.' };
  }

  const subjectParts: string[] = [];
  subjectParts.push('FBS Event');
  if (ev.title) subjectParts.push(String(ev.title));
  const subject = subjectParts.join(' — ');

  const html = renderEventEmailHtml({
    groupName: 'Friday Bible Study',
    title: String(ev.title ?? 'Untitled Event'),
    content: String(ev.content ?? ''),
    startsAt: ev.startsAt ?? null,
    endsAt: ev.endsAt ?? null,
    location: ev.location ?? null,
    actionUrl: process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL}/events` : undefined,
  });

  try {
    let toFinal: string[] = [];

    if (to.length > 0) {
      toFinal = to;
    } else if (cc.length > 0) {
      // fall back to cc if no direct recipients
      toFinal = cc;
    } else {
      toFinal = [];
    }

    await sendEmail({
      // From: prefer group mailbox so replies thread into group inbox if configured
      from: groupAddress || undefined,
      to: toFinal,
      cc: cc.length > 0 ? cc : undefined,
      replyTo: groupAddress || undefined,
      subject,
      html,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Email send failed.' };
  }
}
