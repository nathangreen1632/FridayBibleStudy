// Client/src/stores/board.store.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { ListPrayersResponse } from '../types/api.type';
import type { Category, Status } from '../types/domain.types';

type ColumnKey = 'active' | 'archived';

type Item = ListPrayersResponse['items'][number];

function sortByPosition(a: Item, b: Item) {
  return a.position - b.position;
}

type BoardState = {
  // Data
  byId: Map<number, Item>;
  order: { active: number[]; archived: number[] };

  // UI/controls
  loading: boolean;
  error?: string | null;
  page: number;
  hasMore: boolean;
  sort: 'name' | 'date' | 'prayer' | 'status';
  q: string;
  filterStatus?: Status;
  filterCategory?: Category;

  // Actions
  fetchInitial: () => Promise<void>;
  move: (id: number, toStatus: ColumnKey, newIndex: number) => Promise<boolean>;
  setSort: (s: BoardState['sort']) => void;
  setQuery: (q: string) => void;
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

  setSort: (s) => set({ sort: s }),
  setQuery: (q) => set({ q }),

  fetchInitial: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api<ListPrayersResponse>('/api/prayers?page=1&pageSize=20');

      const byId = new Map<number, Item>();
      data.items.forEach((it) => byId.set(it.id, it));

      const active = data.items
        .filter((i) => i.status === 'active')
        .sort(sortByPosition)
        .map((i) => i.id);

      const archived = data.items
        .filter((i) => i.status === 'archived')
        .sort(sortByPosition)
        .map((i) => i.id);

      set({
        byId,
        order: { active, archived },
        page: 1,
        hasMore: data.items.length >= 20,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'Failed to load prayers' });
    }
  },

  move: async (id, toStatus, newIndex) => {
    const { byId, order } = get();

    // Guard: item must exist
    const item = byId.get(id);
    if (!item) return false;

    // Capture previous state for rollback
    const prevById = new Map(byId);
    const prevOrder = { active: [...order.active], archived: [...order.archived] };

    // Helpers
    const moveIdWithin = (list: number[], movedId: number, toIdx: number) => {
      const arr = list.filter((x) => x !== movedId);
      const idx = Math.max(0, Math.min(toIdx, arr.length));
      arr.splice(idx, 0, movedId);
      return arr;
    };

    // --- Optimistic update ---
    const nextById = new Map(byId);
    const nextOrder = { active: [...order.active], archived: [...order.archived] };

    if (toStatus === 'active') {
      nextOrder.archived = nextOrder.archived.filter((x) => x !== id);
      nextOrder.active = moveIdWithin([...nextOrder.active, id], id, newIndex);
    } else {
      nextOrder.active = nextOrder.active.filter((x) => x !== id);
      nextOrder.archived = moveIdWithin([...nextOrder.archived, id], id, newIndex);
    }

    // Update item’s status/position optimistically
    const updated = { ...item, status: toStatus, position: newIndex };
    nextById.set(id, updated);

    set({ byId: nextById, order: nextOrder });

    // --- Persist (with reCAPTCHA) ---
    try {
      await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, position: newIndex }),
      });
      return true;
    } catch (e) {
      console.error('Move failed', e);
      set({ byId: prevById, order: prevOrder });
      return false;
    }
  },
}));
