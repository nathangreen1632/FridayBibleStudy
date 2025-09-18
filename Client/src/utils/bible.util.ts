import type { PassageItem } from '../types/ui/verseOfDay.types.ts';

export function pickPassage(body: any): PassageItem | null {
  const newItem = body?.data?.data?.[0];
  if (newItem?.content || newItem?.reference) return newItem;

  const oldItem = body?.data?.passages?.[0];
  if (oldItem?.content || oldItem?.reference) return oldItem;

  const rawItem = body?.data?.[0];
  if (rawItem?.content || rawItem?.reference) return rawItem;

  return null;
}
