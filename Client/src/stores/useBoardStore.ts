// Client/src/stores/useBoardStore.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { ListPrayersResponse } from '../types/api.type';
import type { Category, Status } from '../types/domain.types';

type ColumnKey = 'active' | 'archived';
type Item = ListPrayersResponse['items'][number];

// --- Robust numeric sort by position with a tie-breaker ---
// We coerce to number to avoid NaN (e.g., undefined or string from API)
// Tie-breaker uses id to keep a stable deterministic order when positions match.
function sortByPosition(a: Item, b: Item) {
  const pa = Number(a?.position ?? 0);
  const pb = Number(b?.position ?? 0);
  if (pa < pb) return -1;
  if (pa > pb) return 1;
  // stable tiebreak so order doesn't jitter
  return a.id - b.id;
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

function msgFrom(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message || fallback;
  }
  return fallback;
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

  // Drag guard (used by DnD to prevent socket reorders mid-drag)
  isDragging: boolean;                 // NEW
  setDragging: (v: boolean) => void;   // NEW

  // Initial fetch
  fetchInitial: () => Promise<void>;

  // Drag/drop persist
  move: (id: number, toStatus: ColumnKey, newIndex: number) => Promise<boolean>;

  // Socket-friendly optimistic patch ops (LOCAL ONLY — NO NETWORK)
  upsertPrayer: (p: Item) => void;
  movePrayer: (id: number, to: Status) => void;

  // NEW: instant visual bump to top for the card’s current board
  bumpToTop: (id: number) => void;

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

  // NEW: drag guard state
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

  // ---- Drag/drop persist ----
  move: async (id, toStatus, newIndex) => {
    const { byId, order } = get();

    // Guard: item must exist
    const item = byId.get(id);
    if (!item) {
      set({ error: 'Item not found' });
      return false;
    }

    // Bound newIndex to a safe range for the target column
    const targetList = toStatus === 'active' ? order.active : order.archived;
    const safeIndex = Math.max(0, Math.min(newIndex, targetList.length));

    // Capture previous state for rollback
    const prevById = new Map(byId);
    const prevOrder = { active: [...order.active], archived: [...order.archived] };

    // --- Optimistic update ---
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

      // Update item’s status/position optimistically
      const updated: Item = { ...item, status: toStatus, position: safeIndex };
      nextById.set(id, updated);

      set({ byId: nextById, order: nextOrder, error: null });
    } catch (err: unknown) {
      set({ byId: prevById, order: prevOrder, error: msgFrom(err, 'Could not apply move locally') });
      return false;
    }

    // --- Persist (with reCAPTCHA) ---
    try {
      await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, position: safeIndex }),
      });
      return true;
    } catch (err: unknown) {
      // Roll back on failure
      set({ byId: prevById, order: prevOrder, error: msgFrom(err, 'Failed to save new position') });
      return false;
    }
  },

  // ---- Socket-driven optimistic patches (LOCAL ONLY) ----
  upsertPrayer: (p) => {
    try {
      set((state) => {
        const byId = new Map(state.byId);
        const prev = byId.get(p.id);
        const merged: Item = { ...(prev ?? ({} as Item)), ...p };
        byId.set(p.id, merged);

        // If it’s praise, remove from both board columns
        if (merged.status === 'praise') {
          const active = state.order.active.filter((x) => x !== p.id);
          const archived = state.order.archived.filter((x) => x !== p.id);
          return { byId, order: { active, archived } };
        }

        const order = { active: [...state.order.active], archived: [...state.order.archived] };

        if (merged.status === 'active') {
          order.archived = order.archived.filter((x) => x !== p.id);
          if (!order.active.includes(p.id)) order.active = [p.id, ...order.active];
          // Always re-sort the affected column by numeric position (even when only position changed)
          order.active = rebuildColumn(byId, order.active, 'active');
        } else if (merged.status === 'archived') {
          order.active = order.active.filter((x) => x !== p.id);
          if (!order.archived.includes(p.id)) order.archived = [p.id, ...order.archived];
          // Always re-sort the affected column by numeric position (even when only position changed)
          order.archived = rebuildColumn(byId, order.archived, 'archived');
        }

        return { byId, order, error: null };
      });
    } catch {
      // Ignore socket patch errors to avoid UI crashes
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
          // remove from both
          // (this is defensive; your upsertPrayer handles praise too)
          active = active.filter((x) => x !== id);
          archived = archived.filter((x) => x !== id);
        }

        return { byId, order: { active, archived }, error: null };
      });
    } catch {
      // Ignore socket patch errors
    }
  },

  // NEW: instant visual bump to the top of the card’s current board (no network)
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
      // status 'praise' is handled by the Praises store
      return;
    }

    set({ order: next });
  },
}));
