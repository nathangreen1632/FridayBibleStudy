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

// insert id at a given index, removing any previous occurrence
function moveIdWithin(list: number[], movedId: number, toIdx: number): number[] {
  const without = list.filter((x) => x !== movedId);
  const idx = Math.max(0, Math.min(toIdx, without.length));
  without.splice(idx, 0, movedId);
  return without;
}

// (Re)build a single column’s order from byId
function rebuildColumn(byId: Map<number, Item>, ids: number[], status: ColumnKey): number[] {
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Item => !!p && p.status === status)
    .sort(sortByPosition)
    .map((p) => p.id);
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

  // Initial fetch
  fetchInitial: () => Promise<void>;

  // Drag/drop persist (KEEPING your original signature)
  move: (id: number, toStatus: ColumnKey, newIndex: number) => Promise<boolean>;

  // Socket-friendly optimistic patch ops (LOCAL ONLY — NO NETWORK)
  upsertPrayer: (p: Item) => void;
  movePrayer: (id: number, to: Status) => void;

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

  // ---- Drag/drop persist (unchanged API) ----
  move: async (id, toStatus, newIndex) => {
    const { byId, order } = get();

    // Guard: item must exist
    const item = byId.get(id);
    if (!item) return false;

    // Capture previous state for rollback
    const prevById = new Map(byId);
    const prevOrder = { active: [...order.active], archived: [...order.archived] };

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
    const updated: Item = { ...item, status: toStatus, position: newIndex };
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

  // ---- Socket-driven optimistic patches (LOCAL ONLY) ----
  upsertPrayer: (p) => {
    set((state) => {
      const byId = new Map(state.byId);
      const prev = byId.get(p.id);

      // merge new fields
      const merged: Item = { ...(prev ?? {} as Item), ...p };
      byId.set(p.id, merged);

      // If it’s praise, remove from both board columns (still stored in byId for other views)
      if (merged.status === 'praise') {
        const active = state.order.active.filter((x) => x !== p.id);
        const archived = state.order.archived.filter((x) => x !== p.id);
        return { byId, order: { active, archived } };
      }

      // Rebuild only the affected column by position
      const order = { active: [...state.order.active], archived: [...state.order.archived] };
      if (merged.status === 'active') {
        // ensure it is not in archived
        order.archived = order.archived.filter((x) => x !== p.id);
        // ensure it’s present in active, then rebuild active by position
        if (!order.active.includes(p.id)) order.active = [p.id, ...order.active];
        order.active = rebuildColumn(byId, order.active, 'active');
      } else if (merged.status === 'archived') {
        order.active = order.active.filter((x) => x !== p.id);
        if (!order.archived.includes(p.id)) order.archived = [p.id, ...order.archived];
        order.archived = rebuildColumn(byId, order.archived, 'archived');
      }

      return { byId, order };
    });
  },

  movePrayer: (id, to) => {
    // Local-only move used by socket “moved” events (position provided via upsert payload)
    set((state) => {
      const item = state.byId.get(id);
      if (!item) return {}; // nothing to do

      const byId = new Map(state.byId);
      const moved: Item = { ...item, status: to };
      byId.set(id, moved);

      // Remove from both columns first
      let active = state.order.active.filter((x) => x !== id);
      let archived = state.order.archived.filter((x) => x !== id);

      if (to === 'active') {
        // insert (temp) then rebuild by position
        active = [id, ...active];
        active = rebuildColumn(byId, active, 'active');
      } else if (to === 'archived') {
        archived = [id, ...archived];
        archived = rebuildColumn(byId, archived, 'archived');
      } else {
        // praise → not shown on this 2-column board
      }

      return { byId, order: { active, archived } };
    });
  },
}));
