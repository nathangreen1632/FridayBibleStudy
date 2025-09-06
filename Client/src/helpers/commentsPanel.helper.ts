// Client/src/helpers/commentsPanel.helper.ts
import type { Comment } from '../types/comment.types';

/** Parse ISO-ish strings to epoch ms; returns 0 on bad/missing input. */
export function safeParseTime(iso?: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Scan local items and return newest createdAt timestamp (ms). */
export function newestLocalFrom(
  rootOrder: ReadonlyArray<number | string> | undefined,
  byId: Map<number | string, Comment> | undefined
): number {
  if (!Array.isArray(rootOrder) || !(byId instanceof Map)) return 0;

  let newest = 0;
  for (const id of rootOrder) {
    const c = byId.get(id);
    if (!c || c.deletedAt) continue;

    const t = safeParseTime(c.createdAt);
    if (t > newest) newest = t;
  }
  return newest;
}

/** Type guard: filters Map.get results and hides deleted comments. */
export function isLiveComment(c: Comment | undefined | null): c is Comment {
  return Boolean(c && !c.deletedAt);
}

/** Prefer store count; otherwise fall back to loaded order length. */
export function computeDisplayCount(
  count: number | undefined,
  order?: Array<number | string>
): number {
  if (typeof count === 'number') return count;
  if (Array.isArray(order)) return order.length;
  return 0;
}

/** True if server has a comment newer than when the user last saw this prayer. */
export function hasNewFlag(lastCommentAt?: string | null, lastSeenAt?: string | null): boolean {
  const newest = safeParseTime(lastCommentAt);
  if (!newest) return false;
  const seen = safeParseTime(lastSeenAt);
  if (!seen) return true; // never seen before but we have comments
  return newest > seen;
}

/** Stable DESC sort of live root items by createdAt using safeParseTime. */
export function sortRootItemsDesc(
  byId: Map<number | string, Comment> | undefined,
  rootOrder?: Array<number | string>
): Comment[] {
  const ids = Array.isArray(rootOrder) ? rootOrder : [];
  const list = ids.map((id) => byId?.get(id)).filter(isLiveComment);
  list.sort((a, b) => safeParseTime(b.createdAt) - safeParseTime(a.createdAt));
  return list;
}
