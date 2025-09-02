// Client/src/stores/useCommentsStore.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { Comment, ListRepliesResponse, ListRootThreadsResponse } from '../types/comment.types';
import { useAuthStore } from './useAuthStore'; // NEW: use current user for optimistic author

type ReplyPage = { cursor?: string | null; hasMore: boolean; loading: boolean; error?: string | null };
type ThreadState = {
  byId: Map<number | string, Comment>;
  rootOrder: Array<number | string>;
  repliesOrderByRoot: Map<number | string, Array<number | string>>;
  rootPage: { cursor?: string | null; hasMore: boolean; loading: boolean; error?: string | null };
  replyPageByRoot: Map<number | string, ReplyPage>;
};

type CommentsState = {
  counts: Map<number, number>;
  lastCommentAt: Map<number, string>;
  closed: Map<number, boolean>;
  unseen: Map<number, string>;
  threadsByPrayer: Map<number, ThreadState>;

  setCounts: (prayerId: number, count: number, lastCommentAt?: string | null, isClosed?: boolean) => void;

  fetchRootPage: (prayerId: number, limit?: number) => Promise<void>;
  fetchReplies: (prayerId: number, rootId: number, limit?: number) => Promise<void>;

  create: (prayerId: number, content: string, opts?: { parentId?: number; cid?: string }) => Promise<void>;
  update: (commentId: number, content: string) => Promise<void>;
  remove: (commentId: number) => Promise<void>;

  markSeen: (prayerId: number) => Promise<void>;
  setClosedLocal: (prayerId: number, isClosed: boolean) => void;

  onCreated: (payload: { prayerId: number; comment: Comment; newCount: number; lastCommentAt: string | null }) => void;
  onUpdated: (payload: { prayerId: number; comment: Comment }) => void;
  onDeleted: (payload: { prayerId: number; commentId: number; newCount: number; lastCommentAt: string | null }) => void;
  onClosedChanged: (payload: { prayerId: number; isCommentsClosed: boolean }) => void;
  onCountChanged: (payload: { prayerId: number; newCount: number; lastCommentAt: string | null }) => void;
};

function ensureThread(s: Map<number, ThreadState>, prayerId: number): ThreadState {
  const ex = s.get(prayerId);
  if (ex) return ex;
  const t: ThreadState = {
    byId: new Map(),
    rootOrder: [],
    repliesOrderByRoot: new Map(),
    rootPage: { cursor: null, hasMore: true, loading: false, error: null },
    replyPageByRoot: new Map(),
  };
  s.set(prayerId, t);
  return t;
}

function msg(e: unknown, fb: string) {
  return e && typeof e === 'object' && 'message' in e ? String((e as any).message || fb) : fb;
}

// Secure ID helpers (no Math.random)
function secureHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function makeCid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return `cid_${c.randomUUID()}`;
  if (c && typeof c.getRandomValues === 'function') return `cid_${secureHex(16)}`;
  // ultra-rare fallback (no randomness; avoids Math.random to satisfy Sonar)
  return `cid_${Date.now().toString(36)}`;
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

  // Roots (latest-activity ordered)
  fetchRootPage: async (prayerId, limit = 10) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);
      if (t.rootPage.loading || (!t.rootPage.hasMore && t.rootOrder.length > 0)) {
        set({ threadsByPrayer: threads });
        return;
      }
      t.rootPage.loading = true;
      t.rootPage.error = null;
      set({ threadsByPrayer: threads });

      const params = new URLSearchParams();
      if (t.rootPage.cursor) params.set('cursor', String(t.rootPage.cursor));
      params.set('limit', String(limit));
      params.set('prayerId', String(prayerId));

      const data = await api<ListRootThreadsResponse>(`/api/comments/list?${params.toString()}`);

      for (const item of data.items) {
        // merge to preserve any local fields like authorName if server omits
        const prevRoot = t.byId.get(item.root.id);
        t.byId.set(item.root.id, {
          ...prevRoot,
          ...item.root,
          authorName: item.root.authorName ?? prevRoot?.authorName ?? null,
        });
        const arr = (item.repliesPreview || []).map((r) => {
          const prev = t.byId.get(r.id);
          t.byId.set(r.id, { ...prev, ...r, authorName: r.authorName ?? prev?.authorName ?? null });
          return r.id;
        });
        t.repliesOrderByRoot.set(item.root.id, arr);
      }

      // --- DEDUPED push of roots
      const newRoots = data.items.map((i) => i.root.id);
      const seen = new Set(t.rootOrder);
      for (const id of newRoots) {
        if (!seen.has(id)) {
          seen.add(id);
          t.rootOrder.push(id);
        }
      }

      t.rootPage.cursor = data.cursor ?? null;
      t.rootPage.hasMore = data.hasMore;
      t.rootPage.loading = false;

      const counts = new Map(get().counts);
      counts.set(prayerId, data.commentCount ?? 0);

      const lastCA = new Map(get().lastCommentAt);
      if (data.lastCommentAt) lastCA.set(prayerId, data.lastCommentAt);

      const closed = new Map(get().closed);
      closed.set(prayerId, data.isCommentsClosed);

      set({ threadsByPrayer: threads, counts, lastCommentAt: lastCA, closed });
    } catch (e) {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);
      t.rootPage.loading = false;
      t.rootPage.error = msg(e, 'Failed to load comments');
      set({ threadsByPrayer: threads });
    }
  },

  // Replies for a given root
  fetchReplies: async (prayerId, rootId, limit = 10) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);
      const page =
        t.replyPageByRoot.get(rootId) || { cursor: null, hasMore: true, loading: false, error: null };
      if (page.loading || !page.hasMore) {
        set({ threadsByPrayer: threads });
        return;
      }
      page.loading = true;
      page.error = null;
      t.replyPageByRoot.set(rootId, page);
      set({ threadsByPrayer: threads });

      const params = new URLSearchParams();
      if (page.cursor) params.set('cursor', String(page.cursor));
      params.set('limit', String(limit));
      params.set('rootId', String(rootId));

      const data = await api<ListRepliesResponse>(`/api/comments/replies?${params.toString()}`);

      for (const c of data.items) {
        const prev = t.byId.get(c.id);
        t.byId.set(c.id, { ...prev, ...c, authorName: c.authorName ?? prev?.authorName ?? null });
      }

      // --- DEDUPED merge of replies
      const current = t.repliesOrderByRoot.get(rootId) || [];
      const incoming = data.items.map((c) => c.id);
      const setIds = new Set([...current, ...incoming]);
      t.repliesOrderByRoot.set(rootId, Array.from(setIds));

      page.cursor = data.cursor ?? null;
      page.hasMore = data.hasMore;
      page.loading = false;
      t.replyPageByRoot.set(rootId, page);
      set({ threadsByPrayer: threads });
    } catch (e) {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);
      const page =
        t.replyPageByRoot.get(rootId) || { cursor: null, hasMore: true, loading: false, error: null };
      page.loading = false;
      page.error = msg(e, 'Failed to load replies');
      t.replyPageByRoot.set(rootId, page);
      set({ threadsByPrayer: threads });
    }
  },

  // Create (optimistic), then reconcile with server id
  create: async (prayerId, content, opts) => {
    // NOTE: dedupe + reconciliation improvements
    let depth = 0;
    let rootId: number | string | null = null;
    let cid = opts?.cid ?? makeCid();
    const parentId = opts?.parentId;

    // helper — remove optimistic entry
    const rollbackOptimistic = (
      pId: number,
      tempCid: number | string,
      d: 0 | 1,
      rId?: number | string | null
    ) => {
      try {
        const s = get();
        const threads = new Map(s.threadsByPrayer);
        const t = threads.get(pId);
        if (!t) return;

        t.byId.delete(tempCid as any);

        if (d === 0) {
          t.rootOrder = t.rootOrder.filter((x: any) => x !== tempCid);
          t.repliesOrderByRoot.delete(tempCid as any);
        } else if (rId != null) {
          const arr = t.repliesOrderByRoot.get(rId) || [];
          t.repliesOrderByRoot.set(rId, arr.filter((x: any) => x !== tempCid));
        }

        set({ threadsByPrayer: threads });
      } catch {}
    };

    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);

      if (parentId) {
        const parent = t.byId.get(parentId);
        if (parent) {
          depth = (parent.depth ?? 0) + 1;
          rootId = parent.threadRootId ?? parent.id;
        }
      }

      // author from auth store for optimistic entry
      const me = useAuthStore.getState().user as { id?: number; name?: string; email?: string } | null;
      const optimistic: Comment = {
        id: -1,
        prayerId,
        parentId: parentId ?? null,
        threadRootId: typeof rootId === 'number' ? rootId : null,
        depth,
        authorId: Number(me?.id ?? 0),
        authorName: me?.name ?? me?.email ?? 'You',
        content,
        createdAt: new Date().toISOString(),
      };
      t.byId.set(cid, optimistic);

      if (depth === 0) {
        t.rootOrder = [cid, ...t.rootOrder];
        t.repliesOrderByRoot.set(cid, []);
      } else if (rootId != null) {
        const arr = t.repliesOrderByRoot.get(rootId) || [];
        t.repliesOrderByRoot.set(rootId, [...arr, cid]);
        // bump thread with newest activity to the top
        t.rootOrder = [rootId, ...t.rootOrder.filter((x) => x !== rootId)];
      }
      set({ threadsByPrayer: threads });

      const r = await apiWithRecaptcha(`/api/comments/create`, 'comment_create', {
        method: 'POST',
        body: JSON.stringify({ prayerId, content, parentId, cid }),
      });

      if (!r.ok) {
        rollbackOptimistic(prayerId, cid, depth === 0 ? 0 : 1, rootId);
        return;
      }

      const parsed = (await r.json().catch(() => null)) as
        | { ok?: boolean; comment?: Comment; cid?: string; error?: string }
        | null;

      if (!parsed || !parsed.ok || !parsed.comment) {
        rollbackOptimistic(prayerId, cid, depth === 0 ? 0 : 1, rootId);
        return;
      }

      const saved = parsed.comment;

      const threads2 = new Map(get().threadsByPrayer);
      const t2 = ensureThread(threads2, prayerId);

      // if the socket already inserted saved.id, just drop the cid
      const serverAlreadyPresent = t2.byId.has(saved.id);
      if (serverAlreadyPresent) {
        rollbackOptimistic(prayerId, cid, depth === 0 ? 0 : 1, rootId);
        return;
      }

      // otherwise, swap cid -> saved.id
      const old = t2.byId.get(cid);
      t2.byId.delete(cid);
      t2.byId.set(saved.id, {
        ...(old ?? {}),
        ...saved,
        authorName: saved.authorName ?? old?.authorName ?? null,
      });

      if (depth === 0) {
        t2.rootOrder = t2.rootOrder.map((x) => (x === cid ? saved.id : x));
        if (!t2.repliesOrderByRoot.has(saved.id))
          t2.repliesOrderByRoot.set(saved.id, t2.repliesOrderByRoot.get(cid) || []);
        t2.repliesOrderByRoot.delete(cid);
      } else if (rootId != null) {
        const arr = t2.repliesOrderByRoot.get(rootId) || [];
        t2.repliesOrderByRoot.set(
          rootId,
          arr.map((x) => (x === cid ? saved.id : x))
        );
      }

      set({ threadsByPrayer: threads2 });
    } catch {
      // network/parse error → rollback optimistic entry
      rollbackOptimistic(prayerId, cid, depth === 0 ? 0 : 1, rootId);
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
          const prev = t.byId.get(commentId) as Comment;
          t.byId.set(commentId, { ...prev, deletedAt: new Date().toISOString(), content: '[deleted]' });
          set({ threadsByPrayer: threads });
          break;
        }
      }
    } catch {}
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

  // ---- Socket handlers ----
  onCreated: (p) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, p.prayerId);

      // remove a matching optimistic placeholder before inserting server copy
      for (const [k, v] of t.byId) {
        if ((typeof v?.id === 'number' && v.id < 0) && v.content === p.comment.content) {
          const sameDepth = (v.depth ?? 0) === (p.comment.depth ?? 0);
          const sameAuthor = v.authorId === p.comment.authorId;
          const sameParentOrRoot =
            (v.depth ?? 0) === 0
              ? true
              : (v.parentId ?? null) === (p.comment.parentId ?? null) ||
              (v.threadRootId ?? null) === (p.comment.threadRootId ?? null);
          if (sameDepth && sameAuthor && sameParentOrRoot) {
            if ((v.depth ?? 0) === 0) {
              t.rootOrder = t.rootOrder.filter((x) => x !== k);
              t.repliesOrderByRoot.delete(k);
            } else {
              const rId = p.comment.threadRootId!;
              const arr = t.repliesOrderByRoot.get(rId) || [];
              t.repliesOrderByRoot.set(rId, arr.filter((x) => x !== k));
            }
            t.byId.delete(k);
            break;
          }
        }
      }

      // insert/merge server comment
      const prev = t.byId.get(p.comment.id);
      t.byId.set(p.comment.id, {
        ...prev,
        ...p.comment,
        authorName: p.comment.authorName ?? prev?.authorName ?? null,
      });

      if (p.comment.depth === 0) {
        t.rootOrder = [p.comment.id, ...t.rootOrder.filter((x) => x !== p.comment.id)];
        if (!t.repliesOrderByRoot.has(p.comment.id)) t.repliesOrderByRoot.set(p.comment.id, []);
      } else {
        const root = p.comment.threadRootId!;
        const arr = t.repliesOrderByRoot.get(root) || [];
        if (!arr.includes(p.comment.id)) {
          t.repliesOrderByRoot.set(root, [...arr, p.comment.id]);
        }
        t.rootOrder = [root, ...t.rootOrder.filter((x) => x !== root)];
      }

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
        t.byId.set(p.comment.id, {
          ...prev,
          ...p.comment,
          authorName: p.comment.authorName ?? prev?.authorName ?? null,
        });
        set({ threadsByPrayer: threads });
      }
    } catch {}
  },

  onDeleted: (p) => {
    try {
      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, p.prayerId);
      const prev = t.byId.get(p.commentId);
      if (prev) {
        t.byId.set(p.commentId, { ...prev, deletedAt: new Date().toISOString(), content: '[deleted]' });
      }

      const counts = new Map(get().counts);
      counts.set(p.prayerId, p.newCount ?? counts.get(p.prayerId) ?? 0);

      const lastCA = new Map(get().lastCommentAt);
      if (p.lastCommentAt) lastCA.set(p.prayerId, p.lastCommentAt);

      set({ threadsByPrayer: threads, counts, lastCommentAt: lastCA });
    } catch {}
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
