// Client/src/helpers/api/bibleApi.ts
import { api, apiRaw, readBody } from '../http.helper';

export async function fetchBibleList(): Promise<Response> {
  return api('/api/bible/bibles', { method: 'GET' });
}

export async function fetchPassage(reference: string, bibleId?: string): Promise<Response> {
  const qp = new URLSearchParams({ reference });
  if (bibleId) qp.set('bibleId', bibleId);
  const qs = qp.toString();
  const url = qs ? `/api/bible/passage?${qs}` : '/api/bible/passage';
  return api(url, { method: 'GET' });
}

export async function fetchVerseOfDay(bibleId?: string): Promise<Response> {
  const qp = new URLSearchParams();
  if (bibleId) qp.set('bibleId', bibleId);
  const qs = qp.toString();
  const url = qs ? `/api/bible/verse-of-day?${qs}` : '/api/bible/verse-of-day';
  return api(url, { method: 'GET' });
}

export function fetchFirstChapter(bibleId?: string) {
  const qp = bibleId ? `?bibleId=${encodeURIComponent(bibleId)}` : '';
  return fetch(`/api/bible/first-chapter${qp}`, { credentials: 'include' });
}

export function fetchChapterById(chapterId: string, bibleId?: string) {
  const qp = bibleId ? `?bibleId=${encodeURIComponent(bibleId)}` : '';
  return fetch(`/api/bible/chapter/${encodeURIComponent(chapterId)}${qp}`, { credentials: 'include' });
}

/** --- tolerant books endpoint (updated) --- */

export type Book = { id: string; name: string; abbreviation?: string };

function coerceBooks(body: unknown): Book[] {
  const b: any = body;

  // ✅ add support for { ok: true, data: Book[] }
  if (Array.isArray(b?.data)) return b.data as Book[];

  // existing shapes
  if (Array.isArray(b?.data?.data)) return b.data.data as Book[];
  if (Array.isArray(b?.data?.books)) return b.data.books as Book[];
  if (Array.isArray(b?.books)) return b.books as Book[];
  if (Array.isArray(b)) return b as Book[];

  return [];
}

/**
 * Tolerant fetch that never throws and normalizes the list of books.
 * Callers handle { ok, status, data, error }.
 */
export async function fetchBooks(
  bibleId?: string
): Promise<{ ok: boolean; status: number; data: Book[]; error?: string }> {
  const qp = new URLSearchParams();
  if (bibleId) qp.set('bibleId', bibleId);
  const url = qp.toString() ? `/api/bible/books?${qp.toString()}` : '/api/bible/books';

  const res = await apiRaw(url, { method: 'GET' });
  const { ok, status, body, contentType } = await readBody(res);

  if (!ok) {
    const error = typeof body === 'string' ? body : (body?.error ?? `HTTP ${status}`);
    return { ok: false, status, data: [], error };
  }

  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    return { ok: false, status, data: [], error: 'Unexpected non-JSON response for books' };
  }

  const data = coerceBooks(body);
  return { ok: true, status, data };
}

/** --- chapters endpoint (unchanged) --- */
export async function fetchChapters(bookId: string, bibleId?: string): Promise<Response> {
  const qp = new URLSearchParams();
  qp.set('bookId', bookId);
  if (bibleId) qp.set('bibleId', bibleId);
  const url = `/api/bible/chapters?${qp.toString()}`;
  return apiRaw(url, { method: 'GET' });
}
