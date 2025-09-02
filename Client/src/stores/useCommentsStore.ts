// Client/src/stores/useCommentsStore.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { Comment, ListRepliesResponse, ListRootThreadsResponse } from '../types/comment.types';

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

      // NEW PATH: /api/comments/list
      const data = await api<ListRootThreadsResponse>(`/api/comments/list?${params.toString()}`);

      for (const item of data.items) {
        t.byId.set(item.root.id, item.root);
        const arr = (item.repliesPreview || []).map((r) => {
          t.byId.set(r.id, r);
          return r.id;
        });
        t.repliesOrderByRoot.set(item.root.id, arr);
      }
      const newRoots = data.items.map((i) => i.root.id);
      t.rootOrder = t.rootOrder.concat(newRoots);

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

      // NEW PATH: /api/comments/replies
      const data = await api<ListRepliesResponse>(`/api/comments/replies?${params.toString()}`);

      for (const c of data.items) t.byId.set(c.id, c);
      const current = t.repliesOrderByRoot.get(rootId) || [];
      const merged = [...current, ...data.items.map((c) => c.id)];
      t.repliesOrderByRoot.set(rootId, merged);

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
    try {
      const cid = opts?.cid || `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const parentId = opts?.parentId;

      const threads = new Map(get().threadsByPrayer);
      const t = ensureThread(threads, prayerId);

      let depth = 0;
      let rootId: number | string | null = null;
      if (parentId) {
        const parent = t.byId.get(parentId);
        if (parent) {
          depth = (parent.depth ?? 0) + 1;
          rootId = parent.threadRootId ?? parent.id;
        }
      }

      const optimistic: Comment = {
        id: -1,
        prayerId,
        parentId: parentId ?? null,
        threadRootId: typeof rootId === 'number' ? rootId : null,
        depth,
        authorId: 0,
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

      // NEW PATH: /api/comments/create
      const r = await apiWithRecaptcha(`/api/comments/create`, 'comment_create', {
        method: 'POST',
        body: JSON.stringify({ prayerId, content, parentId, cid }),
      });
      if (!r.ok) return;

      const parsed = (await r.json().catch(() => null)) as
        | { ok?: boolean; comment?: Comment; cid?: string }
        | null;
      if (!parsed || !parsed.ok || !parsed.comment) return;

      // ✅ Narrow to a guaranteed value to satisfy TS (prevents TS18048)
      const saved = parsed.comment;

      const threads2 = new Map(get().threadsByPrayer);
      const t2 = ensureThread(threads2, prayerId);

      const old = t2.byId.get(cid) || saved;
      t2.byId.delete(cid);
      t2.byId.set(saved.id, { ...old, ...saved });

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
      // ignore; optimistic entry remains (UI can show it and later sync from socket)
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
          t.byId.set(commentId, { ...(t.byId.get(commentId) as Comment), ...body.comment });
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
      // NEW PATH: /api/comments/seen
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
      t.byId.set(p.comment.id, p.comment);

      if (p.comment.depth === 0) {
        t.rootOrder = [p.comment.id, ...t.rootOrder.filter((x) => x !== p.comment.id)];
        if (!t.repliesOrderByRoot.has(p.comment.id)) t.repliesOrderByRoot.set(p.comment.id, []);
      } else {
        const root = p.comment.threadRootId!;
        const arr = t.repliesOrderByRoot.get(root) || [];
        t.repliesOrderByRoot.set(root, [...arr, p.comment.id]);
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
        t.byId.set(p.comment.id, p.comment);
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
