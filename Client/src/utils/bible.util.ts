import type { PassageItem } from '../types/ui/verseOfDay.types.ts';

// Accepts the current/legacy/raw server shapes and picks the first passage
export function pickPassage(body: any): PassageItem | null {
  // Current: { ok, data: { data: [ { content, reference, ... } ], meta } }
  const newItem = body?.data?.data?.[0];
  if (newItem?.content || newItem?.reference) return newItem;

  // Legacy: { ok, data: { passages: [ { content, reference } ] } }
  const oldItem = body?.data?.passages?.[0];
  if (oldItem?.content || oldItem?.reference) return oldItem;

  // Raw provider: body.data is already an array
  const rawItem = body?.data?.[0];
  if (rawItem?.content || rawItem?.reference) return rawItem;

  return null;
}
