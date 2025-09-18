import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { api } from '../helpers/http.helper';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';
import type { Prayer, Status } from '../types/domain/domain.types.ts';
import {
  validateMove,
  makeReordered,
  neighborPositions,
  chooseNewPosition,
  withOptimisticPosition,
  rollbackPosition,
  shouldNormalizeSoon,
  parsePrayerSafely,
  computeSequentialUpdates,
  applyOptimisticPositions,
  mergeSavedIntoById,
} from '../helpers/usePraiseStore.helper';


type PraisesState = {
  byId: Map<number, Prayer>;
  order: number[]; // ordered ids (position asc)
  loading: boolean;
  error?: string | null;
  fetchInitial: () => Promise<void>;
  upsert: (p: Prayer) => void;
  remove: (id: number) => void;
  moveWithin: (id: number, toIndex: number) => Promise<boolean>;
  movePrayer: (id: number, to: Exclude<Status, 'praise'>) => Promise<void>;
  normalizePositions: (step?: number) => Promise<void>;
  bumpToTop: (id: number) => void;
};

function sortIdsByPosition(items: Prayer[]): number[] {
  return [...items]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((i) => i.id);
}

function mergeIn(by: Map<number, Prayer>, p: Prayer): Map<number, Prayer> {
  const next = new Map(by);
  const prev = next.get(p.id);

  if (!prev) {
    next.set(p.id, p);
    return next;
  }

  const merged: Prayer = {
    ...prev,
    ...p,
    author: p.author ?? prev.author,
    attachments: p.attachments ?? prev.attachments,
  };

  next.set(p.id, merged);
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

      const positions = order
        .map((id) => byId.get(id)?.position)
        .filter((p): p is number => typeof p === 'number');
      const cramped = minGap(positions) < 1e-6 || !isStrictlyIncreasing(positions);
      if (cramped) {
        setTimeout(async () => {
          try {
            await get().normalizePositions(STEP_DEFAULT);
          } catch {

          }
        }, 200);
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

    const exists = s.order.includes(p.id);
    const ids = exists ? s.order : [...s.order, p.id];

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

    const { prevOrder, nextOrder } = makeReordered(s0.order, fromIndex, toIndex);
    set({ order: nextOrder });

    const s1 = get();
    const { prevPos, nextPos } = neighborPositions(nextOrder, s1.byId, toIndex);
    const newPos = chooseNewPosition(prevPos, nextPos, STEP_DEFAULT);

    const { before, merged } = withOptimisticPosition(s1.byId, id, newPos);
    if (merged !== s1.byId) set({ byId: merged });

    try {
      const r = await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ position: newPos }),
      });

      if (!r.ok) {
        set({ order: prevOrder });
        const cur = get();
        set({ byId: rollbackPosition(cur.byId, id, before) });
        return false;
      }

      const saved = await parsePrayerSafely(r);
      if (saved) {
        const cur = get();
        const nextBy = new Map(cur.byId);
        const prev = nextBy.get(saved.id);
        nextBy.set(saved.id, prev ? { ...prev, ...saved } : saved);
        set({ byId: nextBy });
      }

      if (shouldNormalizeSoon(prevPos, nextPos, newPos)) {
        setTimeout(async () => {
          try {
            await get().normalizePositions(STEP_DEFAULT);
          } catch {

          }
        }, 200);
      }

      return true;
    } catch {
      set({ order: prevOrder });
      const cur = get();
      set({ byId: rollbackPosition(cur.byId, id, before) });
      return false;
    }
  },


  async movePrayer(id, to) {
    const s = get();
    const existed = s.byId.get(id);

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

      try {
        const saved = (await r.json()) as Prayer | undefined;
        if (saved?.status === 'praise') {
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

      }
    } catch {

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

    const updates = computeSequentialUpdates(order, step);
    set({ byId: applyOptimisticPositions(byId, updates) });

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

      }
    }
  },

  bumpToTop(id) {
    const s = get();
    if (!s.byId.has(id)) return;

    const filtered = s.order.filter((x) => x !== id);
    set({ order: [id, ...filtered] });
  },
}));

export function usePraisesIds(): number[] {
  return usePraisesStore(useShallow((s) => s.order));
}

export function usePraiseById(id: number) {
  return usePraisesStore((s) => s.byId.get(id));
}

export function praisesOnSocketUpsert(p: Prayer) {
  try {
    usePraisesStore.getState().upsert(p);
  } catch {

  }
}

export function praisesOnSocketRemove(id: number) {
  try {
    usePraisesStore.getState().remove(id);
  } catch {

  }
}
