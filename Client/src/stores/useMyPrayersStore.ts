import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { Prayer, Status } from '../types/domain/domain.types.ts';
import { useAuthStore } from './useAuthStore';

type SortKey = 'updated' | 'created' | 'title';
type FilterStatus = 'all' | Status;

type MyPrayersState = {
  byId: Map<number, Prayer>;
  ids: number[];
  loading: boolean;
  error?: string | null;
  q: string;
  status: FilterStatus;
  category: '' | Prayer['category'];
  sort: SortKey;
  dir: 'asc' | 'desc';
  setQuery: (q: string) => void;
  setStatus: (s: FilterStatus) => void;
  setCategory: (c: '' | Prayer['category']) => void;
  setSort: (k: SortKey) => void;
  setDir: (d: 'asc' | 'desc') => void;
  fetchInitial: () => Promise<void>;
  refresh: () => Promise<void>;
  save: (id: number, patch: Partial<Pick<Prayer, 'title' | 'content' | 'category'>>) => Promise<boolean>;
  moveTo: (id: number, to: Status) => Promise<boolean>;
  remove: (id: number) => Promise<boolean>;
  addUpdate: (id: number, content: string) => Promise<boolean>;
  onSocketUpsert: (p: Prayer) => void;
  onSocketRemove: (id: number) => void;
};

function sortIds(items: Prayer[], key: SortKey, dir: 'asc' | 'desc'): number[] {
  const copy = [...items];
  const mult = dir === 'asc' ? 1 : -1;

  copy.sort((a, b) => {
    if (key === 'title') {
      const A = (a.title || '').toLowerCase();
      const B = (b.title || '').toLowerCase();
      if (A < B) return -1 * mult;
      if (A > B) return  1 * mult;
      return 0;
    }
    const aT = key === 'created' ? new Date(a.createdAt).getTime() : new Date(a.updatedAt).getTime();
    const bT = key === 'created' ? new Date(b.createdAt).getTime() : new Date(b.updatedAt).getTime();
    if (aT < bT) return -1 * mult;
    if (aT > bT) return  1 * mult;
    return 0;
  });

  return copy.map((p) => p.id);
}

export const useMyPrayersStore = create<MyPrayersState>((set, get) => ({
  byId: new Map<number, Prayer>(),
  ids: [],
  loading: false,
  error: null,

  q: '',
  status: 'all',
  category: '',
  sort: 'updated',
  dir: 'desc',

  setQuery: (q) => set({ q }),
  setStatus: (s) => set({ status: s }),
  setCategory: (c) => set({ category: c }),
  setSort: (k) => set({ sort: k }),
  setDir: (d) => set({ dir: d }),

  async fetchInitial() {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '200' }); // generous page
      const res = await api<{ items: Prayer[] }>(`/api/prayers/mine?${params.toString()}`);
      const items = Array.isArray(res?.items) ? res.items : [];
      const byId = new Map<number, Prayer>();
      for (const it of items) {
        if (it && typeof it.id === 'number') byId.set(it.id, it);
      }
      const ids = sortIds(items, get().sort, get().dir);
      set({ byId, ids, loading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load your prayers';
      set({ loading: false, error: msg });
    }
  },

  async refresh() {
    await get().fetchInitial();
  },

  async save(id, patch) {
    try {
      const r = await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_update',
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      if (!r.ok) return false;
      const updated = (await r.json()) as Prayer;
      get().onSocketUpsert(updated);
      return true;
    } catch {
      return false;
    }
  },

  async moveTo(id, to) {
    try {
      const r = await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_update',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: to }),
        }
      );
      if (!r.ok) return false;
      const updated = (await r.json()) as Prayer;
      get().onSocketUpsert(updated);
      return true;
    } catch {
      return false;
    }
  },

  async remove(id) {
    try {
      const r = await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_delete',
        { method: 'DELETE' }
      );
      if (!r.ok) return false;
      get().onSocketRemove(id);
      return true;
    } catch {
      return false;
    }
  },

  async addUpdate(id, content) {
    try {
      const r = await apiWithRecaptcha(
        `/api/prayers/${id}/updates`,
        'prayer_add_update',
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      );
      return r.ok;
    } catch {
      return false;
    }
  },

  onSocketUpsert(p) {
    const me = useAuthStore.getState().user?.id;
    if (!me || p.authorUserId !== me) return;

    const cur = get();
    const byId = new Map(cur.byId);
    byId.set(p.id, p);

    const items = cur.ids.map((id) => byId.get(id)).filter(Boolean) as Prayer[];
    if (!items.find((x) => x.id === p.id)) items.push(p);

    const ids = sortIds(items, cur.sort, cur.dir);
    set({ byId, ids });
  },

  onSocketRemove(id) {
    const cur = get();
    if (!cur.byId.has(id)) return;

    const byId = new Map(cur.byId);
    byId.delete(id);
    const ids = cur.ids.filter((x) => x !== id);
    set({ byId, ids });
  },
}));

export function myPrayersOnSocketUpsert(p: Prayer): void {
  try { useMyPrayersStore.getState().onSocketUpsert(p); } catch {}
}

export function myPrayersOnSocketRemove(id: number): void {
  try { useMyPrayersStore.getState().onSocketRemove(id); } catch {}
}
