import type { BibleMeta, PassageItem } from '../types/domain/bible.types.ts';

export const LS_KEY = 'biblePageState:v1';

export function saveState(partial: Record<string, unknown>): void {
  try {
    const prev = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {

  }
}

export function readState<T = unknown>(): T | null {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null') as T | null;
  } catch {
    return null;
  }
}

export function pickPassage(body: unknown): PassageItem | null {
  const anyBody = body as any;
  const newer = anyBody?.data?.data?.[0];
  if (newer?.content || newer?.reference) return newer;

  const older = anyBody?.data?.passages?.[0];
  if (older?.content || older?.reference) return older;

  const providerDirect = Array.isArray(anyBody?.data) ? anyBody.data?.[0] : undefined;
  if (providerDirect?.content || providerDirect?.reference) return providerDirect;

  return null;
}

export function normalizeBibleList(body: unknown): BibleMeta[] {
  const anyBody = body as any;
  if (Array.isArray(anyBody?.data)) return anyBody.data as BibleMeta[];
  if (Array.isArray(anyBody?.data?.data)) return anyBody.data.data as BibleMeta[];
  if (Array.isArray(anyBody?.data?.bibles)) return anyBody.data.bibles as BibleMeta[];
  return [];
}

export function formatBibleLabel(b: BibleMeta): string {
  const parts: string[] = [];
  if (b.abbreviationLocal) parts.push(b.abbreviationLocal);
  if (b.name) parts.push(b.name);
  if (parts.length === 2) return `${parts[0]} – ${parts[1]}`;
  return parts[0] ?? parts[1] ?? '';
}
