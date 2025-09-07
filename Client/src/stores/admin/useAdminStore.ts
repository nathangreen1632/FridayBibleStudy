// Client/src/store/useAdmin.store.ts
import { create } from 'zustand';
import { fetchAdminPrayers, fetchPrayerThread, postAdminComment, patchPrayerStatus } from '../../helpers/api/adminApi';
import type { AdminPrayerRow, AdminListResponse } from '../../types/admin.types.ts';

type State = {
  list: AdminPrayerRow[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  detailComments: Record<number, any[]>;
  loadList: (opts: { q?: string; groupId?: number; status?: string; category?: string; page?: number; pageSize?: number }) => Promise<{ ok: boolean; message?: string }>;
  loadThread: (prayerId: number) => Promise<{ ok: boolean; message?: string }>;
  addComment: (prayerId: number, content: string, token?: string) => Promise<{ ok: boolean; message?: string }>;
  setStatus: (prayerId: number, status: 'active'|'praise'|'archived', token?: string) => Promise<{ ok: boolean; message?: string }>;
};

export const useAdminStore = create<State>((set, get) => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  detailComments: {},
  async loadList(opts) {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (opts.q) params.set('q', opts.q);
      if (opts.groupId) params.set('groupId', String(opts.groupId));
      if (opts.status) params.set('status', opts.status);
      if (opts.category) params.set('category', opts.category);
      params.set('page', String(opts.page ?? get().page));
      params.set('pageSize', String(opts.pageSize ?? get().pageSize));

      const res = await fetchAdminPrayers(params);
      if (!res.ok) { set({ loading: false }); return { ok: false, message: 'Failed to load prayers.' }; }
      const data = (await res.json()) as AdminListResponse<AdminPrayerRow>;
      set({ list: data.items, total: data.total, page: data.page, pageSize: data.pageSize, loading: false });
      return { ok: true };
    } catch {
      set({ loading: false });
      return { ok: false, message: 'Could not load prayers.' };
    }
  },
  async loadThread(prayerId) {
    try {
      const res = await fetchPrayerThread(prayerId);
      if (!res.ok) return { ok: false, message: 'Failed to load comments.' };
      const data = await res.json();
      set((s) => ({ detailComments: { ...s.detailComments, [prayerId]: data.items ?? [] } }));
      return { ok: true };
    } catch {
      return { ok: false, message: 'Could not load comments.' };
    }
  },
  async addComment(prayerId, content, token) {
    try {
      const res = await postAdminComment(prayerId, content, token);
      if (!res.ok) return { ok: false, message: 'Failed to add comment.' };
      const data = await res.json();
      set((s) => ({ detailComments: { ...s.detailComments, [prayerId]: [data.comment, ...(s.detailComments[prayerId] ?? [])] } }));
      return { ok: true };
    } catch {
      return { ok: false, message: 'Could not add comment.' };
    }
  },
  async setStatus(prayerId, status, token) {
    try {
      const res = await patchPrayerStatus(prayerId, status, token);
      if (!res.ok) return { ok: false, message: 'Failed to update status.' };
      // update list row optimistic
      set((s) => ({
        list: s.list.map((r) => (r.id === prayerId ? { ...r, status } : r)),
      }));
      return { ok: true };
    } catch {
      return { ok: false, message: 'Could not update status.' };
    }
  },
}));
