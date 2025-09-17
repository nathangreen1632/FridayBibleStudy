import type { Comment } from '../types/domain/comment.types.ts';

export function safeParseTime(iso?: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

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

export function isLiveComment(c: Comment | undefined | null): c is Comment {
  return Boolean(c && !c.deletedAt);
}

export function computeDisplayCount(
  count: number | undefined,
  order?: Array<number | string>
): number {
  if (typeof count === 'number') return count;
  if (Array.isArray(order)) return order.length;
  return 0;
}

export function hasNewFlag(lastCommentAt?: string | null, lastSeenAt?: string | null): boolean {
  const newest = safeParseTime(lastCommentAt);
  if (!newest) return false;
  const seen = safeParseTime(lastSeenAt);
  if (!seen) return true;
  return newest > seen;
}

export function sortRootItemsDesc(
  byId: Map<number | string, Comment> | undefined,
  rootOrder?: Array<number | string>
): Comment[] {
  const ids = Array.isArray(rootOrder) ? rootOrder : [];
  const list = ids.map((id) => byId?.get(id)).filter(isLiveComment);
  list.sort((a, b) => safeParseTime(b.createdAt) - safeParseTime(a.createdAt));
  return list;
}
