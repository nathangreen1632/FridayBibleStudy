// Client/src/stores/admin/useAdminStore.ts
import { create } from 'zustand';
import {
  fetchAdminPrayers,
  fetchPrayerThread,
  postAdminComment,
  patchPrayerStatus,
  fetchPrayerDetail, // ✅ added
} from '../../helpers/api/adminApi';
import type { AdminPrayerRow, AdminListResponse } from '../../types/admin.types';
import type { Prayer } from '../../types/domain.types';
import type { Comment } from '../../types/comment.types';

type State = {
  list: AdminPrayerRow[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;

  detailPrayers: Record<number, Prayer | undefined>;
  detailRows: Record<number, AdminPrayerRow | undefined>;
  detailComments: Record<number, Comment[]>;

  loadList: (opts: {
    q?: string;
    groupId?: number;
    status?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<{ ok: boolean; message?: string }>;

  loadThread: (prayerId: number) => Promise<{ ok: boolean; message?: string }>;
  addComment: (prayerId: number, content: string) => Promise<{ ok: boolean; message?: string }>;
  setStatus: (
    prayerId: number,
    next: 'active' | 'praise' | 'archived'
  ) => Promise<{ ok: boolean; message?: string }>;
};

function safeIso(input: unknown): string | null {
  if (!input) return null;
  try {
    const s = typeof input === 'string' ? input : String(input);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

/** Accepts common server shapes and normalizes to { prayer, comments } */
function normalizeThreadPayload(
  raw: unknown
): { prayer?: Prayer; comments: Comment[] } {
  const out: { prayer?: Prayer; comments: Comment[] } = { prayer: undefined, comments: [] };
  if (!raw || typeof raw !== 'object') return out;

  const top: any = raw;
  const data = top?.data ?? top;

  const prayer =
    data?.prayer ??
    data?.root ??
    data?.item ??
    data?.thread?.prayer ??
    data?.thread?.root;

  if (prayer && typeof prayer === 'object') {
    out.prayer = prayer as Prayer;
  }

  const comments =
    (Array.isArray(data?.comments) && data.comments) ||
    (Array.isArray(data?.replies) && data.replies) ||
    (Array.isArray(data?.thread?.comments) && data.thread.comments) ||
    [];

  out.comments = comments as Comment[];
  return out;
}

function seedRowsFromList(items: AdminPrayerRow[]): Record<number, AdminPrayerRow> {
  const seeded: Record<number, AdminPrayerRow> = {};
  for (const r of items) seeded[r.id] = r;
  return seeded;
}

/** Merge a row-aligned snapshot for the card meta (no nested ternaries) */
function mergeDetailRow(
  baseRow: AdminPrayerRow | undefined,
  prayer: Prayer | undefined,
  comments: Comment[] | undefined
): AdminPrayerRow | undefined {
  if (!baseRow && !prayer) return undefined;

  const id = baseRow?.id ?? (prayer ? prayer.id : 0);
  const groupId = baseRow?.groupId ?? (prayer ? prayer.groupId : 0);
  const authorUserId = baseRow?.authorUserId ?? (prayer ? prayer.authorUserId : 0);

  const groupName = baseRow?.groupName ?? 'Unknown Group';
  const authorName = baseRow?.authorName ?? 'Unknown Author';

  let title = baseRow?.title ?? 'Untitled';
  if (prayer && typeof prayer.title === 'string' && prayer.title.trim()) {
    title = prayer.title;
  }

  let category: AdminPrayerRow['category'] = baseRow?.category ?? 'prayer';
  if (prayer?.category) {
    category = prayer.category as AdminPrayerRow['category'];
  }

  let status: AdminPrayerRow['status'] = baseRow?.status ?? 'active';
  if (prayer?.status) {
    status = prayer.status as AdminPrayerRow['status'];
  }

  let commentCount = 0;
  if (Array.isArray(comments)) commentCount = comments.length;
  if (!commentCount && typeof baseRow?.commentCount === 'number') commentCount = baseRow.commentCount;

  let lastCommentAt: string | null = null;
  if (Array.isArray(comments) && comments.length > 0) {
    // Use newest comment time; if your API is newest-first this is comments[0]
    const newest = comments.reduce<string | null>((acc, c) => {
      const iso = safeIso(c?.createdAt);
      if (!iso) return acc;
      if (!acc || iso > acc) return iso;
      return acc;
    }, null);
    lastCommentAt = newest ?? null;
  } else {
    lastCommentAt = safeIso(baseRow?.lastCommentAt);
  }

  const updatedAt =
    safeIso(prayer?.updatedAt) ??
    safeIso(baseRow?.updatedAt) ??
    new Date().toISOString();

  return {
    id,
    groupId,
    groupName,
    authorUserId,
    authorName,
    title,
    category,
    status,
    commentCount,
    lastCommentAt,
    updatedAt,
  };
}

export const useAdminStore = create<State>((set, get) => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,

  detailPrayers: {},
  detailRows: {},
  detailComments: {},

  loadList: async (opts) => {
    set({ loading: true });
    try {
      // Your helper requires URLSearchParams
      const params = new URLSearchParams();
      if (opts?.q) params.set('q', opts.q);
      if (typeof opts?.groupId === 'number') params.set('groupId', String(opts.groupId));
      if (opts?.status) params.set('status', opts.status);
      if (opts?.category) params.set('category', opts.category);
      if (typeof opts?.page === 'number') params.set('page', String(opts.page));
      if (typeof opts?.pageSize === 'number') params.set('pageSize', String(opts.pageSize));

      const res = await fetchAdminPrayers(params);
      if (!res.ok) {
        set({ loading: false });
        return { ok: false, message: 'Failed to load list.' };
      }

      const payload = (await res.json()) as AdminListResponse<AdminPrayerRow>;
      if (!payload || !Array.isArray(payload.items)) {
        set({ loading: false });
        return { ok: false, message: 'Invalid list response.' };
      }

      set({
        list: payload.items,
        total: payload.total,
        page: payload.page,
        pageSize: payload.pageSize,
        detailRows: { ...get().detailRows, ...seedRowsFromList(payload.items) },
        loading: false,
      });

      return { ok: true };
    } catch {
      set({ loading: false });
      return { ok: false, message: 'Unable to load admin prayers.' };
    }
  },

  // ✅ Hydrate full prayer content if the thread response doesn't include it
  loadThread: async (prayerId) => {
    if (!prayerId || Number.isNaN(prayerId)) {
      return { ok: false, message: 'Invalid prayer id.' };
    }
    try {
      // 1) Load the thread (comments + maybe a light prayer object)
      const res = await fetchPrayerThread(prayerId);
      if (!res.ok) {
        return { ok: false, message: 'Failed to load thread.' };
      }
      const parsed = await res.json();
      const { prayer: threadPrayer, comments } = normalizeThreadPayload(parsed);

      let prayer: Prayer | undefined = threadPrayer;

      // 2) If missing or missing content, hydrate from prayer detail
      if (!prayer || !prayer.content) {
        try {
          const pRes = await fetchPrayerDetail(prayerId);
          if (pRes.ok) {
            const pJson = await pRes.json();
            // Accept several shapes: {prayer}, {data:{prayer}}, or a bare prayer object
            const pTop: any = pJson;
            const pData = pTop?.data ?? pTop;
            const possible = (pData && pData.prayer) || (pData && pData.item) || pData;

            if (possible && typeof possible === 'object') {
              prayer = { ...(prayer as object), ...(possible as object) } as Prayer;
            }
          }
        } catch {
          // best-effort; ignore if detail endpoint fails
        }
      }

      // 3) Write caches
      set((s) => ({
        detailPrayers: { ...s.detailPrayers, [prayerId]: prayer },
        detailComments: { ...s.detailComments, [prayerId]: Array.isArray(comments) ? comments : [] },
      }));

      // 4) Merge a display row for card meta
      const baseRow =
        get().detailRows[prayerId] ?? get().list.find((r) => r.id === prayerId);
      const merged = mergeDetailRow(baseRow, prayer, comments);
      if (merged) {
        set((s) => ({ detailRows: { ...s.detailRows, [prayerId]: merged } }));
      }

      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to load prayer thread.' };
    }
  },

  addComment: async (prayerId, content) => {
    if (!prayerId || !content || !content.trim()) {
      return { ok: false, message: 'Missing content.' };
    }
    try {
      const res = await postAdminComment(prayerId, content.trim());
      if (!res.ok) {
        return { ok: false, message: 'Unable to post comment.' };
      }

      // Best-effort refresh
      try {
        await get().loadThread(prayerId);
      } catch {}

      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to post comment.' };
    }
  },

  setStatus: async (prayerId, next) => {
    if (!prayerId || !next) {
      return { ok: false, message: 'Invalid status update.' };
    }
    try {
      const res = await patchPrayerStatus(prayerId, next);
      if (!res.ok) {
        return { ok: false, message: 'Unable to update status.' };
      }

      const currentRow = get().detailRows[prayerId];
      const currentPrayer = get().detailPrayers[prayerId];

      const updatedRow = currentRow
        ? { ...currentRow, status: next, updatedAt: new Date().toISOString() }
        : undefined;
      const updatedPrayer = currentPrayer ? { ...currentPrayer, status: next } : undefined;

      set((s) => ({
        detailRows: updatedRow ? { ...s.detailRows, [prayerId]: updatedRow } : s.detailRows,
        detailPrayers: updatedPrayer ? { ...s.detailPrayers, [prayerId]: updatedPrayer } : s.detailPrayers,
        list: s.list.map((r) => (r.id === prayerId ? { ...r, status: next } : r)),
      }));

      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to update status.' };
    }
  },
}));
