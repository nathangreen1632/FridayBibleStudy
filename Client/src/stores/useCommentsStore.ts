import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { Comment, ListRootThreadsResponse } from '../types/domain/comment.types.ts';
import { useAuthStore } from './useAuthStore';
import {
  resolveFetchOpts,
  applyReset,
  shouldSkipLoad,
  markLoading,
  buildListQuery,
  upsertRootsIntoThread,
  mergeOrderNoDupes,
  applyServerPaging,
  applyMetaMaps,
} from '../helpers/commentsStore.helper';

type ThreadState = {
  byId: Map<number | string, Comment>;
  rootOrder: Array<number | string>;
  rootPage: { cursor?: string | null; hasMore: boolean; loading: boolean; error?: string | null };
};

type CommentsState = {
  counts: Map<number, number>;
  lastCommentAt: Map<number, string>;
  closed: Map<number, boolean>;
  unseen: Map<number, string>;
  threadsByPrayer: Map<number, ThreadState>;
  setCounts: (prayerId: number, count: number, lastCommentAt?: string | null, isClosed?: boolean) => void;
  fetchRootPage: (prayerId: number, limit?: number, opts?: { reset?: boolean }) => Promise<void>;
  refreshRoot: (prayerId: number) => void;
  create: (prayerId: number, content: string, opts?: { cid?: string }) => Promise<void>;
  update: (commentId: number, content: string) => Promise<void>;
  remove: (commentId: number) => Promise<void>;
  removeComment: (prayerId: number, commentId: number) => void;
  markSeen: (prayerId: number) => Promise<void>;
  setClosedLocal: (prayerId: number, isClosed: boolean) => void;
  onCreated: (payload: { prayerId: number; comment: Comment; newCount: number; lastCommentAt: string | null }) => void;
  onUpdated: (payload: { prayerId: number; comment: Comment }) => void;
  onDeleted: (payload: {
    prayerId: number;
    commentId?: number;
    id?: number;
    comment?: { id?: number };
    newCount?: number;
    lastCommentAt?: string | null;
  }) => void;
  onClosedChanged: (payload: { prayerId: number; isCommentsClosed: boolean }) => void;
  onCountChanged: (payload: { prayerId: number; newCount: number; lastCommentAt: string | null }) => void;
};

type DeletedPayload = Parameters<CommentsState['onDeleted']>[0];


function ensureThread(s: Map<number, ThreadState>, prayerId: number): ThreadState {
  const ex = s.get(prayerId);
  if (ex) return ex;
  const t: ThreadState = {
    byId: new Map(),
    rootOrder: [],
    rootPage: { cursor: null, hasMore: true, loading: false, error: null },
  };
  s.set(prayerId, t);
  return t;
}

function msg(e: unknown, fb: string) {
  return e && typeof e === 'object' && 'message' in e ? String((e as any).message || fb) : fb;
}

function secureHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
function makeCid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return `cid_${c.randomUUID()}`;
  if (c && typeof c.getRandomValues === 'function') return `cid_${secureHex(16)}`;
  return `cid_${Date.now().toString(36)}`;
}

function toPosInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getDeleteIds(p: unknown): { prayerId: number; commentId: number } {
  const obj = p as Record<string, unknown> | null | undefined;

  const prayerId = toPosInt(obj?.prayerId);
  const fromCommentId = toPosInt(obj?.commentId);
  const fromId = toPosInt(obj?.id);
  const fromNested = toPosInt((obj?.comment as Record<string, unknown> | null | undefined)?.id);

  const commentId = fromCommentId || fromId || fromNested;

  return { prayerId, commentId };
}


export const useCommentsStore = create<CommentsState>((set, get) => ({
  counts: new Map(),
  lastCommentAt: new Map(),
  closed: new Map(),
  unseen: new Map(),
  threadsByPrayer: new Map(),

  setCounts: (prayerId, count, lastAt, isClosed) => {
    try {
      const counts = new Map(get().counts);
      counts.set(prayerId, count);

      const lca = new Map(get().lastCommentAt);
      if (lastAt) lca.set(prayerId, lastAt);

      const closed = new Map(get().closed);
      if (typeof isClosed === 'boolean') closed.set(prayerId, isClosed);

      set({ counts, lastCommentAt: lca, closed });
    } catch {}
  },

  refreshRoot: (prayerId) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ((): ThreadState => {
        const ex = threads.get(prayerId);
        if (ex) return ex;
        const neu: ThreadState = {
          byId: new Map(),
          rootOrder: [],
          rootPage: { cursor: null, hasMore: true, loading: false, error: null },
        };
        threads.set(prayerId, neu);
        return neu;
      })();

      t.byId = new Map();
      t.rootOrder = [];
      t.rootPage = { cursor: null, hasMore: true, loading: false, error: null };

      set({ threadsByPrayer: threads });
    } catch {
      // keep UI resilient; no throws
    }
  },

  fetchRootPage: async (prayerId, limitOrOpts, maybeOpts) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);

      const { limit, opts } = resolveFetchOpts(limitOrOpts, maybeOpts);

      if (opts?.reset) applyReset(t);

      if (shouldSkipLoad(t)) {
        set({ threadsByPrayer: threads });
        return;
      }

      markLoading(t, true);
      set({ threadsByPrayer: threads });

      const qs = buildListQuery(prayerId, limit, t.rootPage.cursor ?? null);
      const data = await api<ListRootThreadsResponse>(`/api/comments/list?${qs}`);

      upsertRootsIntoThread(t, data.items);
      const newRoots = data.items.map(i => i.root.id);
      t.rootOrder = mergeOrderNoDupes(t.rootOrder, newRoots);

      applyServerPaging(t, data);

      const meta = applyMetaMaps(
        () => get().counts,
        () => get().lastCommentAt,
        () => get().closed,
        prayerId,
        data
      );

      set({ threadsByPrayer: threads, ...meta });
    } catch (e) {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);
      markLoading(t, false);
      t.rootPage.error = msg(e, 'Failed to load updates');
      set({ threadsByPrayer: threads });
    }
  },

  create: async (prayerId, content, opts) => {
    const cid = opts?.cid ?? makeCid();

    const rollbackOptimistic = (pId: number, tempCid: number | string) => {
      try {
        const s = get();
        const threads = new Map(s.threadsByPrayer);
        const t = threads.get(pId);
        if (!t) return;
        t.byId.delete(tempCid as any);
        t.rootOrder = t.rootOrder.filter((x: any) => x !== tempCid);
        set({ threadsByPrayer: threads });
      } catch {}
    };

    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);

      const me = useAuthStore.getState().user as { id?: number; name?: string; email?: string } | null;
      const optimistic: Comment = {
        id: -1,
        prayerId,
        parentId: null,
        threadRootId: null,
        depth: 0,
        authorId: Number(me?.id ?? 0),
        authorName: me?.name ?? me?.email ?? 'You',
        content,
        createdAt: new Date().toISOString(),
      };

      t.byId.set(cid, optimistic);
      t.rootOrder = [cid, ...t.rootOrder];
      set({ threadsByPrayer: threads });

      const r = await apiWithRecaptcha(`/api/comments/create`, 'comment_create', {
        method: 'POST',
        body: JSON.stringify({ prayerId, content, cid }),
      });
      if (!r.ok) { rollbackOptimistic(prayerId, cid); return; }

      const parsed = (await r.json().catch(() => null)) as
        | { ok?: boolean; comment?: Comment; cid?: string; error?: string }
        | null;

      if (!parsed || !parsed.ok || !parsed.comment) {
        rollbackOptimistic(prayerId, cid);
        return;
      }

      const saved = parsed.comment;
      const threads2 = new Map(get().threadsByPrayer);
      const t2 = ensureThread(threads2, prayerId);

      // if the socket already inserted saved.id, just drop the cid
      if (t2.byId.has(saved.id)) { rollbackOptimistic(prayerId, cid); return; }

      const old = t2.byId.get(cid);
      t2.byId.delete(cid);
      t2.byId.set(saved.id, { ...(old ?? {}), ...saved, authorName: saved.authorName ?? (old as any)?.authorName ?? null });
      t2.rootOrder = t2.rootOrder.map((x) => (x === cid ? saved.id : x));

      set({ threadsByPrayer: threads2 });
    } catch {
      rollbackOptimistic(prayerId, cid);
    }
  },

  update: async (commentId, content) => {
    try {
      const r = await apiWithRecaptcha(`/api/comments/${commentId}`, 'comment_update', {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      if (!r.ok) return;
      const body = (await r.json().catch(() => null)) as { ok?: boolean; comment?: Comment } | null;
      if (!body?.ok || !body.comment) return;

      const threads = new Map(get().threadsByPrayer);
      for (const [, t] of threads) {
        if (t.byId.has(commentId)) {
          const prev = t.byId.get(commentId) as Comment;
          t.byId.set(commentId, {
            ...prev,
            ...body.comment,
            authorName: body.comment.authorName ?? prev?.authorName ?? null,
          });
          set({ threadsByPrayer: threads });
          break;
        }
      }
    } catch {}
  },

  remove: async (commentId) => {
    try {
      const r = await apiWithRecaptcha(`/api/comments/${commentId}`, 'comment_delete', { method: 'DELETE' });
      if (!r.ok) return;

      const body = (await r.json().catch(() => null)) as { ok?: boolean; commentId?: number } | null;
      if (!body?.ok) return;

      const threads = new Map(get().threadsByPrayer);
      for (const [, t] of threads) {
        if (t.byId.has(commentId)) {
          t.byId.delete(commentId);
          t.rootOrder = t.rootOrder.filter((x) => x !== commentId);
          set({ threadsByPrayer: threads });
          break;
        }
      }
    } catch {}
  },

  removeComment: (prayerId, commentId) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);
      if (t.byId.has(commentId)) {
        t.byId.delete(commentId);
        t.rootOrder = t.rootOrder.filter((x) => x !== commentId);
        set({ threadsByPrayer: threads });
      }
    } catch {

    }
  },

  markSeen: async (prayerId) => {
    try {
      const at = new Date().toISOString();
      const r = await apiWithRecaptcha(`/api/comments/seen`, 'comment_seen', {
        method: 'POST',
        body: JSON.stringify({ prayerId, at }),
      });
      if (!r.ok) return;
      const body = (await r.json().catch(() => null)) as { ok?: boolean; lastSeenAt?: string } | null;
      const unseen = new Map(get().unseen);
      if (body?.ok && body.lastSeenAt) unseen.set(prayerId, body.lastSeenAt);
      set({ unseen });
    } catch {}
  },

  setClosedLocal: (prayerId, isClosed) => {
    try {
      const closed = new Map(get().closed);
      closed.set(prayerId, isClosed);
      set({ closed });
    } catch {}
  },

  onCreated: (p) => {
    try {
      if ((p.comment.depth ?? 0) !== 0) return;

      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, p.prayerId);

      for (const [k, v] of t.byId) {
        if ((typeof v?.id === 'number' && v.id < 0) && v.content === p.comment.content) {
          t.rootOrder = t.rootOrder.filter((x) => x !== k);
          t.byId.delete(k as any);
          break;
        }
      }

      const prev = t.byId.get(p.comment.id);
      t.byId.set(p.comment.id, { ...prev, ...p.comment, authorName: p.comment.authorName ?? prev?.authorName ?? null });

      t.rootOrder = [p.comment.id, ...t.rootOrder.filter((x) => x !== p.comment.id)];

      const counts = new Map(get().counts);
      counts.set(p.prayerId, p.newCount ?? counts.get(p.prayerId) ?? 0);

      const lastCA = new Map(get().lastCommentAt);
      if (p.lastCommentAt) lastCA.set(p.prayerId, p.lastCommentAt);

      set({ threadsByPrayer: threads, counts, lastCommentAt: lastCA });
    } catch {}
  },

  onUpdated: (p) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, p.prayerId);
      if (t.byId.has(p.comment.id)) {
        const prev = t.byId.get(p.comment.id) as Comment;
        t.byId.set(p.comment.id, { ...prev, ...p.comment, authorName: p.comment.authorName ?? prev?.authorName ?? null });
        set({ threadsByPrayer: threads });
      }
    } catch {}
  },

  onDeleted: (p: DeletedPayload) => {
    try {
      const { prayerId, commentId } = getDeleteIds(p);
      if (!prayerId || !commentId) return;

      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);

      if (t.byId.delete(commentId)) {
        t.rootOrder = t.rootOrder.filter((x) => x !== commentId);
      }

      const counts = new Map(get().counts);
      if (typeof p.newCount === 'number') {
        counts.set(prayerId, p.newCount);
      }

      const lastCA = new Map(get().lastCommentAt);
      const lastAt = p.lastCommentAt ?? undefined; // string | undefined
      if (lastAt) {
        lastCA.set(prayerId, lastAt);
      }

      set({ threadsByPrayer: threads, counts, lastCommentAt: lastCA });
    } catch {

    }
  },



  onClosedChanged: (p) => {
    try {
      const closed = new Map(get().closed);
      closed.set(p.prayerId, p.isCommentsClosed);
      set({ closed });
    } catch {}
  },

  onCountChanged: (p) => {
    try {
      const counts = new Map(get().counts);
      counts.set(p.prayerId, p.newCount ?? counts.get(p.prayerId) ?? 0);

      const lastCA = new Map(get().lastCommentAt);
      if (p.lastCommentAt) lastCA.set(p.prayerId, p.lastCommentAt);

      set({ counts, lastCommentAt: lastCA });
    } catch {}
  },
}));
