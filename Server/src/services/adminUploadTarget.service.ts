import { Group, GroupMember } from '../models/index.js';

type ResolveGroupResult = { ok: boolean; groupId?: number };

/** Create or reuse a singleton group for admin uploads when user has no group. */
async function ensureSystemMediaGroup(): Promise<ResolveGroupResult> {
  try {
    // Your ERD shows groups has: id, name, slug, groupEmail, timestamps.
    // We won't assume unique constraints; we just find by name.
    const name = '[System] Media Group';

    const existing = await Group.findOne({ where: { name } });
    if (existing?.id) return { ok: true, groupId: existing.id };

    const attrs: Record<string, any> =
      (Group as unknown as { rawAttributes?: Record<string, any> }).rawAttributes ?? {};

    const payload: Record<string, unknown> = { name };

    if (Object.prototype.hasOwnProperty.call(attrs, 'slug')) {
      payload.slug = 'system-media-group';
    }
    if (Object.prototype.hasOwnProperty.call(attrs, 'groupEmail')) {
      payload.groupEmail = null; // optional; leave empty
    }

    const created = await Group.create(payload as any);
    if (created?.id) return { ok: true, groupId: created.id };

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Resolve a usable group for admin uploads:
 * 1) explicit groupId (body/query)
 * 2) first group membership for the user (groupMembers)
 * 3) [System] Media Group (created if needed)
 */
export async function resolveAdminUploadGroupId(
  req: any,
  authUserId: number
): Promise<number | undefined> {
  try {
    // 1) body/query hint
    const raw = req.body?.groupId ?? req.query?.groupId;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);

    // 2) first membership
    const gm = await GroupMember.findOne({
      where: { userId: authUserId },
      order: [['createdAt', 'ASC']],
    });
    if (gm?.groupId && gm.groupId > 0) {
      return Math.floor(gm.groupId);
    }

    // 3) system fallback
    const sys = await ensureSystemMediaGroup();
    if (sys.ok && sys.groupId) return sys.groupId;

    return undefined;
  } catch {
    return undefined;
  }
}
