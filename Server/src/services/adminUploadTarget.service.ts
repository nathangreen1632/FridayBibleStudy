import { Group, GroupMember } from '../models/index.js';

type ResolveGroupResult = { ok: boolean; groupId?: number };

async function ensureSystemMediaGroup(): Promise<ResolveGroupResult> {
  try {
    const name = '[System] Media Group';

    const existing = await Group.findOne({ where: { name } });
    if (existing?.id) return { ok: true, groupId: existing.id };

    const attrs: Record<string, any> =
      (Group as unknown as { rawAttributes?: Record<string, any> }).rawAttributes ?? {};

    const payload: Record<string, unknown> = { name };

    if (Object.hasOwn(attrs, 'slug')) {
      payload.slug = 'system-media-group';
    }
    if (Object.hasOwn(attrs, 'groupEmail')) {
      payload.groupEmail = null;
    }

    const created = await Group.create(payload as any);
    if (created?.id) return { ok: true, groupId: created.id };

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function resolveAdminUploadGroupId(
  req: any,
  authUserId: number
): Promise<number | undefined> {
  try {
    const raw = req.body?.groupId ?? req.query?.groupId;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);

    const gm = await GroupMember.findOne({
      where: { userId: authUserId },
      order: [['createdAt', 'ASC']],
    });
    if (gm?.groupId && gm.groupId > 0) {
      return Math.floor(gm.groupId);
    }

    const sys = await ensureSystemMediaGroup();
    if (sys.ok && sys.groupId) return sys.groupId;

    return undefined;
  } catch {
    return undefined;
  }
}
