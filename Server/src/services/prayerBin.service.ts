// Server/src/services/prayerBin.service.ts
import { Prayer } from '../models/index.js';

type EnsureBinResult = { ok: boolean; prayerId?: number; message?: string };

/**
 * Ensure a per-group "[System] Media Bin" prayer.
 * - Satisfies NOT NULL columns dynamically (e.g., content)
 * - Sets enum defaults (category/status) if columns exist
 * - Only touches columns that exist on the model
 */
export async function ensureMediaBinPrayer(
  groupId: number,
  authorUserId: number
): Promise<EnsureBinResult> {
  try {
    const title = 'Admin Media Bin';

    // 1) Reuse if it already exists for this group
    const existing = await Prayer.findOne({ where: { groupId, title } });
    if (existing?.id) return { ok: true, prayerId: existing.id };

    // 2) Create new — schema aware
    const attrs: Record<string, any> =
      (Prayer as unknown as { rawAttributes?: Record<string, any> }).rawAttributes ?? {};

    const payload: Record<string, unknown> = {
      title,
      groupId,
      authorUserId, // matches your ERD
    };

    // Helper: set enum safely if present
    const setEnum = (key: string, prefer: string, fallback: string) => {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) return;
      const a = (attrs as any)[key];
      if (Array.isArray(a?.values) && a.values.length > 0) {
        payload[key] = a.values.includes(prefer) ? prefer : a.values[0];
      } else {
        payload[key] = fallback;
      }
    };

    // Your ERD shows enums: category, status
    setEnum('category', 'prayer', 'prayer');
    setEnum('status', 'active', 'active');

    // Satisfy NOT NULL fields dynamically
    // content (TEXT) is NOT NULL in your runtime model
    if (Object.prototype.hasOwnProperty.call(attrs, 'content')) {
      // If allowNull === false, set a default content string
      const a = (attrs as any)['content'];
      if (a?.allowNull === false) {
        payload['content'] =
          'Auto-created media bucket for admin uploads.';
      } else if (payload['content'] === undefined) {
        // Set anyway to be safe
        payload['content'] = 'Media bin';
      }
    }

    // Common columns seen in your ERD — set safe defaults only if they exist
    const setBool = (key: string, val: boolean) => {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) payload[key] = val;
    };
    const setInt = (key: string, val: number) => {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) payload[key] = val;
    };
    const setDateNow = (key: string) => {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) payload[key] = new Date();
    };

    setBool('isCommentsClosed', false);
    setInt('position', 0);
    setInt('commentCount', 0);
    setDateNow('lastCommentAt');
    // If your model has 'impersonatedByAdminId', leave it unset (NULL)

    const created = await Prayer.create(payload as any);
    if (created?.id) return { ok: true, prayerId: created.id };

    return { ok: false, message: 'Create returned no id' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ensureMediaBinPrayer] error:', err);
    return { ok: false, message: 'Exception creating Media Bin' };
  }
}
