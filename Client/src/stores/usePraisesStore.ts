// Client/src/stores/praises.store.ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { Prayer, Status } from '../types/domain.types';
import {
  validateMove,
  makeReordered,
  neighborPositions,
  chooseNewPosition,
  withOptimisticPosition,
  rollbackPosition,
  shouldNormalizeSoon,
  parsePrayerSafely,
  // NEW:
  computeSequentialUpdates,
  applyOptimisticPositions,
  mergeSavedIntoById,
} from '../helpers/usePraiseStore.helper';


type PraisesState = {
  byId: Map<number, Prayer>;
  order: number[]; // ordered ids (position asc)
  loading: boolean;
  error?: string | null;

  // data
  fetchInitial: () => Promise<void>;

  // local updates + server persistence
  upsert: (p: Prayer) => void;
  remove: (id: number) => void;
  moveWithin: (id: number, toIndex: number) => Promise<boolean>;
  movePrayer: (id: number, to: Exclude<Status, 'praise'>) => Promise<void>;

  // occasional maintenance
  normalizePositions: (step?: number) => Promise<void>;

  // NEW: instant visual bump to top (no network)
  bumpToTop: (id: number) => void;
};

// ---- helpers ----
function sortIdsByPosition(items: Prayer[]): number[] {
  return [...items]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((i) => i.id);
}

function mergeIn(by: Map<number, Prayer>, p: Prayer): Map<number, Prayer> {
  const next = new Map(by);
  const prev = next.get(p.id);
  next.set(p.id, prev ? { ...prev, ...p } : p);
  return next;
}

function isStrictlyIncreasing(positions: number[]): boolean {
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) return false;
  }
  return true;
}

function minGap(positions: number[]): number {
  if (positions.length < 2) return Number.POSITIVE_INFINITY;
  let g = Number.POSITIVE_INFINITY;
  for (let i = 1; i < positions.length; i++) {
    g = Math.min(g, positions[i] - positions[i - 1]);
  }
  return g;
}

const STEP_DEFAULT = 1024;

// ---- store ----
export const usePraisesStore = create<PraisesState>((set, get) => ({
  byId: new Map<number, Prayer>(),
  order: [],
  loading: false,
  error: null,

  async fetchInitial() {
    set({ loading: true, error: null });
    try {
      const res = await api<{ items: Prayer[] }>('/api/prayers?status=praise&page=1&pageSize=200');
      const items = Array.isArray(res?.items) ? res.items : [];

      const byId = new Map<number, Prayer>();
      for (const it of items) {
        if (it && typeof it.id === 'number') byId.set(it.id, it);
      }
      const order = sortIdsByPosition(items);
      set({ byId, order, loading: false, error: null });

      // After load, check if normalization would help
      const positions = order
        .map((id) => byId.get(id)?.position)
        .filter((p): p is number => typeof p === 'number');
      const cramped = minGap(positions) < 1e-6 || !isStrictlyIncreasing(positions);
      if (cramped) {
        // Schedule so initial paint isn’t blocked
        setTimeout(() => { void get().normalizePositions(STEP_DEFAULT); }, 200);
      }
    } catch (e: unknown) {
      const msg =
        (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
          ? (e as { message: string }).message
          : 'Failed to load praises';
      set({ loading: false, error: msg });
    }
  },

  upsert(p) {
    // Only track items that are currently in 'praise'
    if (p.status !== 'praise') {
      const s = get();
      if (s.byId.has(p.id)) {
        const nextBy = new Map(s.byId);
        nextBy.delete(p.id);
        const nextOrder = s.order.filter((x) => x !== p.id);
        set({ byId: nextBy, order: nextOrder });
      }
      return;
    }

    const s = get();
    const nextBy = mergeIn(s.byId, p);

    // If new, insert; if existing, just re-sort
    const exists = s.order.includes(p.id);
    const ids = exists ? s.order : [...s.order, p.id];

    // Rebuild a minimal array of affected items to sort by 'position'
    const items: Prayer[] = ids
      .map((id) => nextBy.get(id))
      .filter(Boolean) as Prayer[];

    const nextOrder = sortIdsByPosition(items);
    set({ byId: nextBy, order: nextOrder });
  },

  remove(id) {
    const s = get();
    if (!s.byId.has(id)) return;
    const nextBy = new Map(s.byId);
    nextBy.delete(id);
    const nextOrder = s.order.filter((x) => x !== id);
    set({ byId: nextBy, order: nextOrder });
  },

  async moveWithin(id, toIndex) {
    const s0 = get();
    const { ok, fromIndex } = validateMove(s0.order, id, toIndex);
    if (!ok) return false;

    // 1) Local reorder (optimistic)
    const { prevOrder, nextOrder } = makeReordered(s0.order, fromIndex, toIndex);
    set({ order: nextOrder });

    // 2) Compute target position between neighbors
    const s1 = get();
    const { prevPos, nextPos } = neighborPositions(nextOrder, s1.byId, toIndex);
    const newPos = chooseNewPosition(prevPos, nextPos, STEP_DEFAULT);

    // 3) Optimistic position on the target item
    const { before, merged } = withOptimisticPosition(s1.byId, id, newPos);
    if (merged !== s1.byId) set({ byId: merged });

    try {
      const r = await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ position: newPos }),
      });

      if (!r.ok) {
        // rollback order + position
        set({ order: prevOrder });
        const cur = get();
        set({ byId: rollbackPosition(cur.byId, id, before) });
        return false;
      }

      // 4) Merge saved (if any)
      const saved = await parsePrayerSafely(r);
      if (saved) {
        const cur = get();
        const nextBy = new Map(cur.byId);
        const prev = nextBy.get(saved.id);
        nextBy.set(saved.id, prev ? { ...prev, ...saved } : saved);
        set({ byId: nextBy });
      }

      // 5) Schedule normalization if spacing collapsed
      if (shouldNormalizeSoon(prevPos, nextPos, newPos)) {
        setTimeout(() => { void get().normalizePositions(STEP_DEFAULT); }, 200);
      }

      return true;
    } catch {
      // rollback order + position
      set({ order: prevOrder });
      const cur = get();
      set({ byId: rollbackPosition(cur.byId, id, before) });
      return false;
    }
  },


  async movePrayer(id, to) {
    const s = get();
    const existed = s.byId.get(id);

    // optimistic removal from Praises
    if (existed) {
      const nextBy = new Map(s.byId);
      nextBy.delete(id);
      const nextOrder = s.order.filter((x) => x !== id);
      set({ byId: nextBy, order: nextOrder });
    }

    try {
      const r = await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_update',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: to, position: 0 }),
        }
      );

      if (!r.ok) {
        // rollback if we had it before
        if (existed) {
          const s2 = get();
          const backBy = new Map(s2.byId);
          backBy.set(id, existed);
          const backOrder = [...s2.order, id];
          const items = backOrder
            .map((x) => backBy.get(x))
            .filter(Boolean) as Prayer[];
          set({ byId: backBy, order: sortIdsByPosition(items) });
        }
        return;
      }

      // Best-effort to merge saved payload, if provided
      try {
        const saved = (await r.json()) as Prayer | undefined;
        if (saved?.status === 'praise') {
          // if server still says praise, reinsert in correct order
          const cur = get();
          const mergedBy = new Map(cur.byId);
          mergedBy.set(saved.id, saved);
          const ids = [...cur.order, saved.id];
          const items = ids
            .map((x) => mergedBy.get(x))
            .filter(Boolean) as Prayer[];
          set({ byId: mergedBy, order: sortIdsByPosition(items) });
        }
      } catch {
        // ignore body parse
      }
    } catch {
      // Roll back if we had it before
      if (existed) {
        const s2 = get();
        const backBy = new Map(s2.byId);
        backBy.set(id, existed);
        const backOrder = [...s2.order, id];
        const items = backOrder
          .map((x) => backBy.get(x))
          .filter(Boolean) as Prayer[];
        set({ byId: backBy, order: sortIdsByPosition(items) });
      }
    }
  },

  async normalizePositions(step = STEP_DEFAULT) {
    const s = get();
    const { order, byId } = s;
    if (order.length === 0) return;

    // 1) Build updates and apply optimistic local positions
    const updates = computeSequentialUpdates(order, step);
    set({ byId: applyOptimisticPositions(byId, updates) });

    // 2) Persist sequentially (best-effort)
    for (const u of updates) {
      try {
        const r = await apiWithRecaptcha(
          `/api/prayers/${u.id}`,
          'prayer_update',
          {
            method: 'PATCH',
            body: JSON.stringify({ position: u.position }),
          }
        );

        if (r.ok) {
          const saved = await parsePrayerSafely(r);
          if (saved) {
            const cur = get();
            set({ byId: mergeSavedIntoById(cur.byId, saved) });
          }
        }
      } catch {
        // ignore; local order remains usable even if one PATCH fails
      }
    }
  },


  // NEW: local-only visual bump to top of Praises list
  bumpToTop(id) {
    const s = get();
    if (!s.byId.has(id)) return;

    const filtered = s.order.filter((x) => x !== id);
    set({ order: [id, ...filtered] });
  },
}));

// ---- Memoized selectors (stable renders) ----
export function usePraisesIds(): number[] {
  return usePraisesStore(useShallow((s) => s.order));
}

export function usePraiseById(id: number) {
  return usePraisesStore((s) => s.byId.get(id));
}

// ---- Socket-side helpers (used by socket.store.ts) ----
export function praisesOnSocketUpsert(p: Prayer) {
  try {
    usePraisesStore.getState().upsert(p);
  } catch {
    // ignore
  }
}

export function praisesOnSocketRemove(id: number) {
  try {
    usePraisesStore.getState().remove(id);
  } catch {
    // ignore
  }
}
