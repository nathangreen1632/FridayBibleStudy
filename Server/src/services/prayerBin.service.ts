import { Prayer } from '../models/index.js';

type EnsureBinResult = { ok: boolean; prayerId?: number; message?: string };

export async function ensureMediaBinPrayer(
  groupId: number,
  authorUserId: number
): Promise<EnsureBinResult> {
  try {
    const title = 'Admin Media Bin';

    const existing = await Prayer.findOne({ where: { groupId, title } });
    if (existing?.id) return { ok: true, prayerId: existing.id };

    const attrs: Record<string, any> =
      (Prayer as unknown as { rawAttributes?: Record<string, any> }).rawAttributes ?? {};

    const payload: Record<string, unknown> = {
      title,
      groupId,
      authorUserId,
    };

    const hasCol = (key: string) => Object.hasOwn(attrs, key);

    const setEnum = (key: string, prefer: string, fallback: string) => {
      if (!hasCol(key)) return;
      const a = (attrs as any)[key];
      if (Array.isArray(a?.values) && a.values.length > 0) {
        payload[key] = a.values.includes(prefer) ? prefer : a.values[0];
      } else {
        payload[key] = fallback;
      }
    };

    setEnum('category', 'prayer', 'prayer');
    setEnum('status', 'active', 'active');

    if (hasCol('content')) {
      const a = (attrs as any).content;
      if (a?.allowNull === false) {
        payload.content = 'Auto-created media bucket for admin uploads.';
      } else if (payload.content === undefined) {
        payload.content = 'Media bin';
      }
    }

    const setBool = (key: string, val: boolean) => {
      if (hasCol(key)) payload[key] = val;
    };
    const setInt = (key: string, val: number) => {
      if (hasCol(key)) payload[key] = val;
    };
    const setDateNow = (key: string) => {
      if (hasCol(key)) payload[key] = new Date();
    };

    setBool('isCommentsClosed', false);
    setInt('position', 0);
    setInt('commentCount', 0);
    setDateNow('lastCommentAt');

    const created = await Prayer.create(payload as any);
    if (created?.id) return { ok: true, prayerId: created.id };

    return { ok: false, message: 'Create returned no id' };
  } catch (err) {
    console.error('[ensureMediaBinPrayer] error:', err);
    return { ok: false, message: 'Exception creating Media Bin' };
  }
}
