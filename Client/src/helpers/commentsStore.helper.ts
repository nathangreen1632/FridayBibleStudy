import type { Comment, ListRootThreadsResponse } from '../types/domain/comment.types.ts';

export type ThreadLike = {
  byId: Map<number | string, Comment>;
  rootOrder: Array<number | string>;
  rootPage: { cursor?: string | null; hasMore: boolean; loading: boolean; error?: string | null };
};

export type FetchOpts = { reset?: boolean; limit?: number } | undefined;

export function resolveFetchOpts(
  limitOrOpts?: number | FetchOpts,
  maybeOpts?: FetchOpts
): { limit: number; opts: FetchOpts } {
  let opts: FetchOpts = undefined;

  if (typeof limitOrOpts === 'object' && limitOrOpts !== null) {
    opts = limitOrOpts;
  } else if (maybeOpts && typeof maybeOpts === 'object') {
    opts = maybeOpts;
  }

  let limit = 10;
  if (typeof limitOrOpts === 'number') {
    if (Number.isFinite(limitOrOpts) && limitOrOpts > 0) limit = limitOrOpts;
  } else if (opts && typeof opts.limit === 'number') {
    if (Number.isFinite(opts.limit) && opts.limit > 0) limit = opts.limit;
  }

  return { limit, opts };
}

export function applyReset(t: ThreadLike): void {
  t.byId = new Map();
  t.rootOrder = [];
  t.rootPage = { cursor: null, hasMore: true, loading: false, error: null };
}

export function shouldSkipLoad(t: ThreadLike): boolean {
  return Boolean(t.rootPage.loading || (!t.rootPage.hasMore && t.rootOrder.length > 0));
}

export function markLoading(t: ThreadLike, v: boolean): void {
  t.rootPage.loading = v;
  if (v) t.rootPage.error = null;
}

export function buildListQuery(prayerId: number, limit: number, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', String(cursor));
  params.set('limit', String(limit));
  params.set('prayerId', String(prayerId));
  return params.toString();
}

export function upsertRootsIntoThread(
  t: ThreadLike,
  items: ListRootThreadsResponse['items']
): void {
  const nextById = new Map(t.byId);
  for (const item of items) {
    const id = item.root.id;
    const prev = nextById.get(id);
    nextById.set(id, {
      ...prev,
      ...item.root,
      authorName: item.root.authorName ?? prev?.authorName ?? null,
    });
  }
  t.byId = nextById;
}

export function mergeOrderNoDupes(
  current: Array<number | string>,
  newIds: Array<number | string>
): Array<number | string> {
  const seen = new Set(current);
  const merged = [...current];
  for (const id of newIds) {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }
  return merged;
}

export function applyServerPaging(
  t: ThreadLike,
  data: ListRootThreadsResponse
): void {
  t.rootPage.cursor = data.cursor ?? null;
  t.rootPage.hasMore = Boolean(data.hasMore);
  t.rootPage.loading = false;
}

export function applyMetaMaps(
  getCounts: () => Map<number, number>,
  getLastCommentAt: () => Map<number, string>,
  getClosed: () => Map<number, boolean>,
  prayerId: number,
  data: ListRootThreadsResponse
): { counts: Map<number, number>; lastCommentAt: Map<number, string>; closed: Map<number, boolean> } {
  const counts = new Map(getCounts());
  counts.set(prayerId, data.commentCount ?? 0);

  const lastCA = new Map(getLastCommentAt());
  if (data.lastCommentAt) lastCA.set(prayerId, data.lastCommentAt);

  const closed = new Map(getClosed());
  closed.set(prayerId, data.isCommentsClosed);

  return { counts, lastCommentAt: lastCA, closed };
}
