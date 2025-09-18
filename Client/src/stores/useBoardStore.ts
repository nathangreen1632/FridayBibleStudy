import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { ListPrayersResponse } from '../types/api/api.type.ts';
import type { Category, Status } from '../types/domain/domain.types.ts';

type ColumnKey = 'active' | 'archived';
type Item = ListPrayersResponse['items'][number];

function sortByPosition(a: Item, b: Item) {
  const pa = Number(a?.position ?? 0);
  const pb = Number(b?.position ?? 0);
  if (pa < pb) return -1;
  if (pa > pb) return 1;
  return a.id - b.id;
}

function moveIdWithin(list: number[], movedId: number, toIdx: number): number[] {
  const without = list.filter((x) => x !== movedId);
  const idx = Math.max(0, Math.min(toIdx, without.length));
  without.splice(idx, 0, movedId);
  return without;
}

function rebuildColumn(byId: Map<number, Item>, ids: number[], status: ColumnKey): number[] {
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Item => !!p && p.status === status)
    .sort(sortByPosition)
    .map((p) => p.id);
}

function msgFrom(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message || fallback;
  }
  return fallback;
}

type BoardState = {
  byId: Map<number, Item>;
  order: { active: number[]; archived: number[] };
  loading: boolean;
  error?: string | null;
  page: number;
  hasMore: boolean;
  sort: 'name' | 'date' | 'prayer' | 'status';
  q: string;
  filterStatus?: Status;
  filterCategory?: Category;
  isDragging: boolean;
  setDragging: (v: boolean) => void;
  fetchInitial: () => Promise<void>;
  move: (id: number, toStatus: ColumnKey, newIndex: number) => Promise<boolean>;
  upsertPrayer: (p: Item) => void;
  movePrayer: (id: number, to: Status) => void;
  bumpToTop: (id: number) => void;
  setSort: (s: BoardState['sort']) => void;
  setQuery: (q: string) => void;
  removePrayer: (id: number) => void;
};

export const useBoardStore = create<BoardState>((set, get) => ({
  byId: new Map(),
  order: { active: [], archived: [] },
  loading: false,
  error: null,
  page: 1,
  hasMore: true,
  sort: 'date',
  q: '',
  isDragging: false,
  setDragging: (v) => set({ isDragging: v }),
  setSort: (s) => set({ sort: s }),
  setQuery: (q) => set({ q }),

  fetchInitial: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api<ListPrayersResponse>('/api/prayers?page=1&pageSize=20');

      const items: Item[] = Array.isArray(data?.items) ? data.items : [];
      const byId = new Map<number, Item>();
      for (const it of items) {
        if (it) byId.set(it.id, it);
      }

      const active = items
        .filter((i) => i?.status === 'active')
        .sort(sortByPosition)
        .map((i) => i.id);

      const archived = items
        .filter((i) => i?.status === 'archived')
        .sort(sortByPosition)
        .map((i) => i.id);

      set({
        byId,
        order: { active, archived },
        page: 1,
        hasMore: items.length >= 20,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      set({ loading: false, error: msgFrom(err, 'Failed to load prayers') });
    }
  },

  move: async (id, toStatus, newIndex) => {
    const { byId, order } = get();

    const item = byId.get(id);
    if (!item) {
      set({ error: 'Item not found' });
      return false;
    }

    const targetList = toStatus === 'active' ? order.active : order.archived;
    const safeIndex = Math.max(0, Math.min(newIndex, targetList.length));

    const prevById = new Map(byId);
    const prevOrder = { active: [...order.active], archived: [...order.archived] };

    const nextById = new Map(byId);
    const nextOrder = { active: [...order.active], archived: [...order.archived] };

    try {
      if (toStatus === 'active') {
        nextOrder.archived = nextOrder.archived.filter((x) => x !== id);
        nextOrder.active = moveIdWithin([...nextOrder.active, id], id, safeIndex);
      } else {
        nextOrder.active = nextOrder.active.filter((x) => x !== id);
        nextOrder.archived = moveIdWithin([...nextOrder.archived, id], id, safeIndex);
      }

      const updated: Item = { ...item, status: toStatus, position: safeIndex };
      nextById.set(id, updated);

      set({ byId: nextById, order: nextOrder, error: null });
    } catch (err: unknown) {
      set({ byId: prevById, order: prevOrder, error: msgFrom(err, 'Could not apply move locally') });
      return false;
    }

    try {
      await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, position: safeIndex }),
      });
      return true;
    } catch (err: unknown) {
      set({ byId: prevById, order: prevOrder, error: msgFrom(err, 'Failed to save new position') });
      return false;
    }
  },

  upsertPrayer: (p) => {
    try {
      set((state) => {
        const byId = new Map(state.byId);
        const prev = byId.get(p.id);
        const merged: Item = { ...(prev ?? ({} as Item)), ...p };
        byId.set(p.id, merged);

        if (merged.status === 'praise') {
          const active = state.order.active.filter((x) => x !== p.id);
          const archived = state.order.archived.filter((x) => x !== p.id);
          return { byId, order: { active, archived } };
        }

        const order = { active: [...state.order.active], archived: [...state.order.archived] };

        if (merged.status === 'active') {
          order.archived = order.archived.filter((x) => x !== p.id);
          if (!order.active.includes(p.id)) order.active = [p.id, ...order.active];
          order.active = rebuildColumn(byId, order.active, 'active');
        } else if (merged.status === 'archived') {
          order.active = order.active.filter((x) => x !== p.id);
          if (!order.archived.includes(p.id)) order.archived = [p.id, ...order.archived];
          order.archived = rebuildColumn(byId, order.archived, 'archived');
        }

        return { byId, order, error: null };
      });
    } catch {

    }
  },

  movePrayer: (id, to) => {
    try {
      set((state) => {
        const item = state.byId.get(id);
        if (!item) return {};

        const byId = new Map(state.byId);
        const moved: Item = { ...item, status: to };
        byId.set(id, moved);

        let active = state.order.active.filter((x) => x !== id);
        let archived = state.order.archived.filter((x) => x !== id);

        if (to === 'active') {
          active = [id, ...active];
          active = rebuildColumn(byId, active, 'active');
        } else if (to === 'archived') {
          archived = [id, ...archived];
          archived = rebuildColumn(byId, archived, 'archived');
        } else if (to === 'praise') {
          active = active.filter((x) => x !== id);
          archived = archived.filter((x) => x !== id);
        }

        return { byId, order: { active, archived }, error: null };
      });
    } catch {

    }
  },

  bumpToTop: (id) => {
    const { byId, order } = get();
    const item = byId.get(id);
    if (!item) return;

    const next = { active: [...order.active], archived: [...order.archived] };

    if (item.status === 'active') {
      const filtered = next.active.filter((x) => x !== id);
      next.active = [id, ...filtered];
    } else if (item.status === 'archived') {
      const filtered = next.archived.filter((x) => x !== id);
      next.archived = [id, ...filtered];
    } else {

      return;
    }

    set({ order: next });
  },

  removePrayer: (id) => {
    try {
      set((state) => {
        const byId = new Map(state.byId);
        byId.delete(id);
        const active = state.order.active.filter((x) => x !== id);
        const archived = state.order.archived.filter((x) => x !== id);
        return { byId, order: { active, archived } };
      });
    } catch {

    }
  },
}));
