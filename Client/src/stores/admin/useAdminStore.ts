// Client/src/stores/admin/useAdminStore.ts
import { create } from 'zustand';
import {
  fetchAdminPrayers,
  fetchPrayerDetail,
  fetchPrayerThread,
  patchPrayerStatus,
  postAdminComment,
  deleteAdminPrayer,
  fetchAdminRoster,
  patchAdminRosterUser,
  deleteAdminRosterUser,
} from '../../helpers/api/adminApi';
import type { AdminListResponse, AdminPrayerRow } from '../../types/admin.types';
import type { Prayer } from '../../types/domain.types';
import type { Comment } from '../../types/comment.types';

/** Roster row shape (admin roster table) */
type RosterRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;

  /** NEW: pause email updates without deleting their account/content */
  emailPaused: boolean;
};

/** NEW: allowed sort fields for roster */
export type RosterSortField =
  | 'name'
  | 'email'
  | 'phone'
  | 'addressStreet'
  | 'addressCity'
  | 'addressState'
  | 'addressZip'
  | 'spouseName';

/** NEW: loadRoster options including sorting */
type LoadRosterOpts = {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: RosterSortField;
  sortDir?: 'asc' | 'desc';
};

type State = {
  list: AdminPrayerRow[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;

  detailPrayers: Record<number, Prayer | undefined>;
  detailRows: Record<number, AdminPrayerRow | undefined>;
  detailComments: Record<number, Comment[]>;

  // Roster state (admin-only)
  roster: RosterRow[];
  rosterTotal: number;
  rosterPage: number;       // 1-based
  rosterPageSize: number;   // fixed to 15
  lastRosterQuery?: string; // remember last q for next/prev

  /** NEW: remember last sort so pagination keeps it */
  lastRosterSortBy?: RosterSortField;
  lastRosterSortDir?: 'asc' | 'desc';

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

  deletePrayer: (prayerId: number) => Promise<{ ok: boolean; message?: string }>;

  // Roster loader
  loadRoster: (opts: LoadRosterOpts) => Promise<{ ok: boolean; message?: string }>;

  // Roster update/delete
  updateRosterRow: (
    id: number,
    patch: Partial<{
      name: string; email: string; phone: string | null;
      addressStreet: string | null; addressCity: string | null; addressState: string | null; addressZip: string | null;
      spouseName: string | null;
      /** NEW: allow updating via generic patch */
      emailPaused: boolean;
    }>
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteRosterRow: (id: number) => Promise<{ ok: boolean; message?: string }>;

  /** NEW: convenience action for the pause button */
  toggleRosterEmailPaused: (id: number, next: boolean) => Promise<{ ok: boolean; message?: string }>;

  // Pagination helpers (1-based page in UI)
  setRosterPage: (page: number) => Promise<void>;
  nextRosterPage: () => Promise<void>;
  prevRosterPage: () => Promise<void>;
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
function normalizeThreadPayload(raw: unknown): { prayer?: Prayer; comments: Comment[] } {
  const out: { prayer?: Prayer; comments: Comment[] } = { prayer: undefined, comments: [] };
  if (!raw || typeof raw !== 'object') return out;

  const top: Record<string, unknown> = raw as Record<string, unknown>;
  const data = (top.data as Record<string, unknown>) ?? top;

  const maybePrayer =
    (data.prayer as Prayer | undefined) ||
    (data.root as Prayer | undefined) ||
    (data.item as Prayer | undefined) ||
    (data.thread && typeof data.thread === 'object'
      ? ((data.thread as Record<string, unknown>).prayer as Prayer | undefined) ||
      ((data.thread as Record<string, unknown>).root as Prayer | undefined)
      : undefined);

  if (maybePrayer && typeof maybePrayer === 'object') {
    out.prayer = maybePrayer;
  }

  const candidates: unknown[] = [];
  if (Array.isArray((data as any).comments)) candidates.push(...((data as any).comments as unknown[]));
  if (Array.isArray((data as any).replies)) candidates.push(...((data as any).replies as unknown[]));
  if (Array.isArray((data as any).items)) candidates.push(...((data as any).items as unknown[]));
  if (Array.isArray((data as any).rows)) candidates.push(...((data as any).rows as unknown[]));

  const thread = (data as any).thread;
  if (thread && typeof thread === 'object') {
    if (Array.isArray(thread.comments)) candidates.push(...(thread.comments as unknown[]));
    if (Array.isArray(thread.replies)) candidates.push(...(thread.replies as unknown[]));
    if (Array.isArray(thread.items)) candidates.push(...(thread.items as unknown[]));
    if (Array.isArray(thread.rows)) candidates.push(...(thread.rows as unknown[]));

    const threadComments = thread.comments;
    if (threadComments && typeof threadComments === 'object') {
      if (Array.isArray(threadComments.items)) candidates.push(...(threadComments.items as unknown[]));
      if (Array.isArray(threadComments.rows)) candidates.push(...(threadComments.rows as unknown[]));
    }
  }

  const mapped: Comment[] = [];
  for (const anyC of candidates) {
    if (!anyC || typeof anyC !== 'object') continue;
    const c = anyC as Record<string, unknown>;

    const idVal = c.id;
    const id = typeof idVal === 'number' ? idVal : Number(idVal);
    if (!Number.isFinite(id)) continue;

    const createdAtRaw =
      (c.createdAt as string | undefined) ??
      (c.created_at as string | undefined) ??
      (c.updatedAt as string | undefined) ??
      (c.updated_at as string | undefined);

    let createdAt: string | null = null;
    if (createdAtRaw) {
      const d = new Date(createdAtRaw);
      if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
    }

    const contentRaw =
      (c.content as string | undefined) ??
      (c.message as string | undefined) ??
      (c.body as string | undefined) ??
      '';

    mapped.push({
      id,
      content: String(contentRaw ?? ''),
      createdAt: createdAt ?? new Date().toISOString(),
      ...(c as object),
    } as Comment);
  }

  out.comments = mapped;
  return out;
}

function seedRowsFromList(items: AdminPrayerRow[]): Record<number, AdminPrayerRow> {
  const seeded: Record<number, AdminPrayerRow> = {};
  for (const r of items) seeded[r.id] = r;
  return seeded;
}

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
  if (prayer?.title?.trim()) {
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

  let lastCommentAt: string | null;
  if (Array.isArray(comments) && comments.length > 0) {
    const newest = comments.reduce<string | null>((acc, c) => {
      const iso = safeIso((c as any)?.createdAt);
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

  // Roster defaults
  roster: [],
  rosterTotal: 0,
  rosterPage: 1,          // keep 1-based
  rosterPageSize: 15,     // fixed client-side
  lastRosterQuery: '',

  // NEW: remember last sort
  lastRosterSortBy: undefined,
  lastRosterSortDir: undefined,

  loadList: async (opts) => {
    set({ loading: true });
    try {
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
      const res = await fetchPrayerThread(prayerId);
      if (!res.ok) {
        return { ok: false, message: 'Failed to load thread.' };
      }
      const parsed = await res.json();
      const { prayer: threadPrayer, comments } = normalizeThreadPayload(parsed);

      let prayer: Prayer | undefined = threadPrayer;

      if (!prayer?.content) {
        try {
          const pRes = await fetchPrayerDetail(prayerId);
          if (pRes.ok) {
            const pTop: any = await pRes.json();
            const pData = pTop?.data ?? pTop;

            let possible: unknown = undefined;
            if (pData && typeof pData === 'object') {
              const obj = pData as Record<string, unknown>;
              possible = obj.prayer ?? obj.item ?? pData;
            }

            if (possible && typeof possible === 'object') {
              prayer = { ...(prayer as object), ...(possible) } as Prayer;
            }
          }
        } catch {
          // best-effort
        }
      }

      set((s) => ({
        detailPrayers: { ...s.detailPrayers, [prayerId]: prayer },
        detailComments: { ...s.detailComments, [prayerId]: Array.isArray(comments) ? comments : [] },
      }));

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
    if (!prayerId || !content?.trim()) {
      return { ok: false, message: 'Missing content.' };
    }
    try {
      const res = await postAdminComment(prayerId, content.trim());
      if (!res.ok) {
        return { ok: false, message: 'Unable to post comment.' };
      }

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

  deletePrayer: async (prayerId) => {
    if (!prayerId || Number.isNaN(prayerId)) {
      return { ok: false, message: 'Invalid prayer id.' };
    }
    try {
      const res = await deleteAdminPrayer(prayerId);
      if (!res || !(res.status >= 200 && res.status < 300)) {
        return { ok: false, message: 'Delete failed.' };
      }

      const s = get();
      const nextList = s.list.filter((row) => row.id !== prayerId);
      const nextDetailPrayers = { ...s.detailPrayers };
      const nextDetailRows = { ...s.detailRows };
      const nextDetailComments = { ...s.detailComments };
      delete nextDetailPrayers[prayerId];
      delete nextDetailRows[prayerId];
      delete nextDetailComments[prayerId];

      set({
        list: nextList,
        total: Math.max(0, s.total - 1),
        detailPrayers: nextDetailPrayers,
        detailRows: nextDetailRows,
        detailComments: nextDetailComments,
      });

      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to delete this prayer right now.' };
    }
  },

  // --- Roster loader (fixed 15/page) ---
  loadRoster: async (opts) => {
    try {
      const q = opts?.q ?? get().lastRosterQuery ?? '';
      const page = typeof opts?.page === 'number' ? opts.page : get().rosterPage || 1;
      const pageSize = 15; // fixed client-side

      // NEW: preserve last-used sort when not provided
      const sortBy = (opts?.sortBy ?? get().lastRosterSortBy);
      const sortDir = (opts?.sortDir ?? get().lastRosterSortDir);

      const res = await fetchAdminRoster({ q, page, pageSize, sortBy, sortDir });
      if (!res?.ok) {
        set({ roster: [], rosterTotal: 0 });
        return { ok: false, message: res?.message ?? 'Failed to load roster.' };
      }

      set({
        lastRosterQuery: q,
        lastRosterSortBy: sortBy,
        lastRosterSortDir: sortDir,
        roster: res.rows ?? [],
        rosterTotal: typeof res.total === 'number' ? res.total : 0,
        rosterPage: page,
        rosterPageSize: pageSize,
      });

      return { ok: true };
    } catch {
      set({ roster: [], rosterTotal: 0 });
      return { ok: false, message: 'Unable to load roster.' };
    }
  },

  // --- Roster update/delete ---
  updateRosterRow: async (id, patch) => {
    try {
      const res = await patchAdminRosterUser(id, patch);
      if (!res?.ok) {
        return { ok: false, message: res?.error ?? 'Update failed.' };
      }

      const row = (res).row as RosterRow | undefined;
      if (row) {
        const s = get();
        const next = s.roster.map((r) => (r.id === id ? { ...r, ...row } : r));
        set({ roster: next });
      }
      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to update roster row.' };
    }
  },

  deleteRosterRow: async (id) => {
    try {
      const res = await deleteAdminRosterUser(id);
      if (!res?.ok) {
        return { ok: false, message: res?.error ?? 'Delete failed.' };
      }

      const s = get();
      const next = s.roster.filter((r) => r.id !== id);
      const nextTotal = s.rosterTotal > 0 ? s.rosterTotal - 1 : 0;
      set({ roster: next, rosterTotal: nextTotal });
      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to delete roster row.' };
    }
  },

  /** NEW: pause/unpause emails for a roster member */
  toggleRosterEmailPaused: async (id, next) => {
    try {
      const res = await patchAdminRosterUser(id, { emailPaused: next });
      if (!res?.ok) {
        return { ok: false, message: res?.error ?? 'Unable to update pause state.' };
      }
      const updated = (res).row as RosterRow | undefined;
      if (updated) {
        const s = get();
        const nextRoster = s.roster.map((r) => (r.id === id ? { ...r, ...updated } : r));
        set({ roster: nextRoster });
      }
      return { ok: true };
    } catch {
      return { ok: false, message: 'Unable to update pause state.' };
    }
  },

  // --- pagination helpers (1-based) ---
  setRosterPage: async (page) => {
    const p = Number.isFinite(page) && page > 0 ? page : 1;
    const { rosterPageSize, lastRosterQuery, lastRosterSortBy, lastRosterSortDir } = get();
    await get().loadRoster({
      q: lastRosterQuery,
      page: p,
      pageSize: rosterPageSize,
      sortBy: lastRosterSortBy,
      sortDir: lastRosterSortDir,
    });
  },
  nextRosterPage: async () => {
    const { rosterPage, rosterPageSize, rosterTotal, lastRosterQuery, lastRosterSortBy, lastRosterSortDir } = get();
    const hasNext = rosterPage * rosterPageSize < (rosterTotal ?? 0);
    if (!hasNext) return;
    await get().loadRoster({
      q: lastRosterQuery,
      page: rosterPage + 1,
      pageSize: rosterPageSize,
      sortBy: lastRosterSortBy,
      sortDir: lastRosterSortDir,
    });
  },
  prevRosterPage: async () => {
    const { rosterPage, rosterPageSize, lastRosterQuery, lastRosterSortBy, lastRosterSortDir } = get();
    const p = Math.max(1, rosterPage - 1);
    if (p === rosterPage) return;
    await get().loadRoster({
      q: lastRosterQuery,
      page: p,
      pageSize: rosterPageSize,
      sortBy: lastRosterSortBy,
      sortDir: lastRosterSortDir,
    });
  },
}));
