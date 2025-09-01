// Client/src/stores/praises.store.ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper'; // ⬅️ add
import type { Prayer, Status } from '../types/domain.types';

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
      const byId = new Map<number, Prayer>();
      res.items.forEach((it) => byId.set(it.id, it));
      const order = sortIdsByPosition(res.items);
      set({ byId, order, loading: false });

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
      set({ loading: false, error: (e as { message?: string })?.message ?? 'Failed to load praises' });
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
    const fromIndex = s0.order.indexOf(id);
    if (fromIndex < 0 || toIndex < 0 || toIndex >= s0.order.length) return false;

    // Reorder locally
    const prevOrder = [...s0.order];
    const nextOrder = [...s0.order];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, id);
    set({ order: nextOrder });

    // Compute a position between neighbors
    const s = get();
    const byId = s.byId; // re-read in case something changed
    const prevId = nextOrder[toIndex - 1];
    const nextId = nextOrder[toIndex + 1];
    const prevPos = typeof prevId === 'number' ? byId.get(prevId)?.position : undefined;
    const nextPos = typeof nextId === 'number' ? byId.get(nextId)?.position : undefined;

    let newPos: number;
    if (typeof prevPos === 'number' && typeof nextPos === 'number') {
      newPos = prevPos + (nextPos - prevPos) / 2;
    } else if (typeof prevPos === 'number') {
      newPos = prevPos + STEP_DEFAULT;
    } else if (typeof nextPos === 'number') {
      newPos = nextPos - STEP_DEFAULT;
    } else {
      newPos = 0;
    }

    // Optimistically set local position for the target item
    const before = byId.get(id);
    if (before) {
      const merged = new Map(byId);
      merged.set(id, { ...before, position: newPos });
      set({ byId: merged });
    }

    try {
      const r = (await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_update',
        {
          method: 'PATCH',
          body: JSON.stringify({ position: newPos }),
        }
      )) as Response; // <-- assert Response


      if (!r.ok) {
        // rollback order + position
        set({ order: prevOrder });
        if (before) {
          const cur = get();
          const merged = new Map(cur.byId);
          merged.set(id, before);
          set({ byId: merged });
        }
        return false;
      }

      const saved = (await r.json()) as Prayer | undefined;
      if (saved) {
        const cur = get();
        const merged = new Map(cur.byId);
        const prev = merged.get(saved.id);
        merged.set(saved.id, prev ? { ...prev, ...saved } : saved);
        set({ byId: merged });
      }

      // If midpoint collapsed (e.g., integer-only DB) or neighbors too close, normalize soon
      if (
        (typeof prevPos === 'number' && newPos === prevPos) ||
        (typeof nextPos === 'number' && newPos === nextPos) ||
        (typeof prevPos === 'number' && typeof nextPos === 'number' && nextPos - prevPos < 1e-6)
      ) {
        setTimeout(() => { void get().normalizePositions(STEP_DEFAULT); }, 200);
      }

      return true;
    } catch {
      // rollback order + position
      set({ order: prevOrder });
      if (before) {
        const cur = get();
        const merged = new Map(cur.byId);
        merged.set(id, before);
        set({ byId: merged });
      }
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
      await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_update',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: to, position: 0 }),
        }
      );



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

    // Optimistically update local positions to a spaced sequence
    const nextBy = new Map(byId);
    const updates: Array<{ id: number; position: number }> = [];

    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const pos = (i + 1) * step;
      const prev = nextBy.get(id);
      if (prev) nextBy.set(id, { ...prev, position: pos });
      updates.push({ id, position: pos });
    }
    set({ byId: nextBy });

    // Persist sequentially (best-effort)
    for (const u of updates) {
      try {
        const r = (await apiWithRecaptcha(
          `/api/prayers/${u.id}`,
          'prayer_update',
          {
            method: 'PATCH',
            body: JSON.stringify({ position: u.position }),
          }
        )) as Response; // <-- assert Response


        if (r.ok) {
          const saved = (await r.json()) as Prayer | undefined;
          if (saved) {
            const cur = get();
            const merged = new Map(cur.byId);
            const prev = merged.get(saved.id);
            merged.set(saved.id, prev ? { ...prev, ...saved } : saved);
            set({ byId: merged });
          }
        }
      } catch {
        // ignore; local order remains usable
      }
    }
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
  usePraisesStore.getState().upsert(p);
}

export function praisesOnSocketRemove(id: number) {
  usePraisesStore.getState().remove(id);
}
