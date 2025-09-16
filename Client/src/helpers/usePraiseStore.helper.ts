// Client/src/helpers/usePraiseStore.helper.ts
import type {Prayer} from '../types/domain/domain.types.ts';

export type PraiseThread = {
  byId: Map<number, Prayer>;
  order: number[];
};

/* ----------------------- existing helpers (from earlier) ------------------- */
export function validateMove(order: number[], id: number, toIndex: number): {
  ok: boolean;
  fromIndex: number;
} {
  const fromIndex = order.indexOf(id);
  const ok = fromIndex >= 0 && toIndex >= 0 && toIndex < order.length;
  return { ok, fromIndex };
}

export function makeReordered(order: number[], fromIndex: number, toIndex: number): {
  prevOrder: number[];
  nextOrder: number[];
} {
  const prevOrder = [...order];
  const nextOrder = [...order];
  nextOrder.splice(fromIndex, 1);
  nextOrder.splice(toIndex, 0, order[fromIndex]);
  return { prevOrder, nextOrder };
}

export function neighborPositions(
  nextOrder: number[],
  byId: Map<number, Prayer>,
  targetIndex: number
): { prevPos?: number; nextPos?: number } {
  const prevId = nextOrder[targetIndex - 1];
  const nextId = nextOrder[targetIndex + 1];
  const prevPos = byId.get(prevId)?.position;
  const nextPos = byId.get(nextId)?.position;
  return { prevPos, nextPos };
}

export function chooseNewPosition(
  prevPos: number | undefined,
  nextPos: number | undefined,
  step: number
): number {
  if (typeof prevPos === 'number' && typeof nextPos === 'number') {
    return prevPos + (nextPos - prevPos) / 2;
  }
  if (typeof prevPos === 'number') return prevPos + step;
  if (typeof nextPos === 'number') return nextPos - step;
  return 0;
}

export function withOptimisticPosition(
  byId: Map<number, Prayer>,
  id: number,
  newPos: number
): { before?: Prayer; merged: Map<number, Prayer> } {
  const before = byId.get(id);
  if (!before) return { before: undefined, merged: byId };
  const merged = new Map(byId);
  merged.set(id, { ...before, position: newPos });
  return { before, merged };
}

export function rollbackPosition(
  currentBy: Map<number, Prayer>,
  id: number,
  before?: Prayer
): Map<number, Prayer> {
  if (!before) return currentBy;
  const merged = new Map(currentBy);
  merged.set(id, before);
  return merged;
}

export function shouldNormalizeSoon(
  prevPos: number | undefined,
  nextPos: number | undefined,
  newPos: number
): boolean {
  const tooClose =
    typeof prevPos === 'number' &&
    typeof nextPos === 'number' &&
    nextPos - prevPos < 1e-6;

  const equalPrev = typeof prevPos === 'number' && newPos === prevPos;
  const equalNext = typeof nextPos === 'number' && newPos === nextPos;

  return tooClose || equalPrev || equalNext;
}

export async function parsePrayerSafely(r: Response): Promise<Prayer | undefined> {
  try {
    return (await r.json()) as Prayer | undefined;
  } catch {
    return undefined;
  }
}

/* ----------------------- NEW helpers for normalizePositions ----------------- */
export type PositionUpdate = { id: number; position: number };

export function positionForIndex(i: number, step: number): number {
  // 1-indexed spacing so positions start at `step`
  return (i + 1) * step;
}

/** Build the list of `{id, position}` updates for a sequential grid. */
export function computeSequentialUpdates(order: number[], step: number): PositionUpdate[] {
  const updates: PositionUpdate[] = [];
  for (let i = 0; i < order.length; i++) {
    updates.push({ id: order[i], position: positionForIndex(i, step) });
  }
  return updates;
}

/** Apply positions optimistically to any IDs that currently exist in byId. */
export function applyOptimisticPositions(
  byId: Map<number, Prayer>,
  updates: PositionUpdate[]
): Map<number, Prayer> {
  if (updates.length === 0) return byId;
  const nextBy = new Map(byId);
  for (const u of updates) {
    const prev = nextBy.get(u.id);
    if (prev) nextBy.set(u.id, { ...prev, position: u.position });
  }
  return nextBy;
}

/** Merge a server-saved Prayer into a byId map (preserving existing fields). */
export function mergeSavedIntoById(
  currentBy: Map<number, Prayer>,
  saved: Prayer
): Map<number, Prayer> {
  const merged = new Map(currentBy);
  const prev = merged.get(saved.id);
  merged.set(saved.id, prev ? { ...prev, ...saved } : saved);
  return merged;
}
