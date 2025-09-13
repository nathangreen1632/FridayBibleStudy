// Server/src/services/bible.service.ts
import { env } from '../config/env.config.js';

type ServiceOk<T> = { ok: true; status: number; data: T };
type ServiceErr = { ok: false; status: number; error?: string };
type ServiceResult<T> = ServiceOk<T> | ServiceErr;

const API_BASE = 'https://api.scripture.api.bible/v1';

let vodayCache: { dateKey: string; bibleId: string; payload: unknown } | null = null;

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if ((env.BIBLE_API_KEY ?? '').trim()) headers['api-key'] = env.BIBLE_API_KEY!;
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers as any) } });
  } catch {
    return new Response(JSON.stringify({ error: 'Upstream unavailable' }), { status: 502 });
  }
}

/* ---------- minimal /passages call: ONLY ?reference= ---------- */
async function fetchPassage(bibleId: string, reference: string): Promise<Response> {
  const qp = new URLSearchParams();
  qp.set('reference', reference);       // ← ONLY this param
  return apiFetch(`/bibles/${encodeURIComponent(bibleId)}/passages?${qp.toString()}`);
}

/* ---------- /bibles ---------- */
export async function listBibles(): Promise<ServiceResult<unknown>> {
  if (!env.BIBLE_API_KEY) {
    return { ok: false, status: 500, error: 'Missing BIBLE_API_KEY' };
  }

  // ✅ Only English bibles
  const res = await apiFetch('/bibles?language=eng');
  const status = res.status;

  if (!res.ok) {
    let error: string | undefined;
    try { error = (await res.json())?.error ?? undefined; } catch { /* ignore */ }
    return { ok: false, status, error: error ?? 'Failed to list bibles' };
  }

  try {
    const body = await res.json();
    return { ok: true, status, data: body };
  } catch {
    return { ok: false, status: 502, error: 'Bad response from provider' };
  }
}


/* ---------- /passages ---------- */
export async function getPassage(bibleId: string, reference: string): Promise<ServiceResult<unknown>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };
  if (!reference?.trim()) return { ok: false, status: 400, error: 'Missing reference' };

  const res = await fetchPassage(id, reference);
  const status = res.status;

  if (!res.ok) {
    if (process.env.NODE_ENV !== 'production') {
      let body = ''; try { body = await res.clone().text(); } catch {}
      // eslint-disable-next-line no-console
      console.warn('[PASSAGE] upstream error:', status, body || '<no body>', { id, reference });
    }
    let error: string | undefined; try { error = (await res.json())?.error; } catch {}
    return { ok: false, status, error: error ?? 'Failed to fetch passage' };
  }

  try { return { ok: true, status, data: await res.json() }; }
  catch { return { ok: false, status: 502, error: 'Bad response from provider' }; }
}

/* ---------- Verse of the Day (minimal) ---------- */
export async function getVerseOfDay(bibleId?: string): Promise<ServiceResult<unknown>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };

  const dateKey = todayKey();
  if (vodayCache && vodayCache.dateKey === dateKey && vodayCache.bibleId === id) {
    return { ok: true, status: 200, data: vodayCache.payload };
  }

  const V = [
    'Jeremiah 29:11','Psalm 23','John 3:16','Romans 8:28','Isaiah 40:31',
    'Proverbs 3:5-6','Philippians 4:6-7','Psalm 46:1','John 14:6','Matthew 6:33',
    'Psalm 118:24','Hebrews 11:1','James 1:5','1 Corinthians 13:4-7','Galatians 5:22-23',
    'Psalm 91:1-2','Romans 12:2','Matthew 11:28-30','Hebrews 12:2','Romans 10:9-10',
    'Philippians 2:3-4','Matthew 5:43-44','1 Peter 5:7','Psalm 121:1-2','John 1:1-5',
    'Psalm 34:8','Colossians 3:23-24','Ephesians 2:8-9','Romans 5:8','Psalm 27:1','Psalm 19:14'
  ];
  const reference = V[(new Date().getUTCDate() - 1) % V.length];

  const res = await fetchPassage(id, reference);
  const status = res.status;

  if (!res.ok) {
    if (process.env.NODE_ENV !== 'production') {
      let body = ''; try { body = await res.clone().text(); } catch {}
      // eslint-disable-next-line no-console
      console.warn('[VODAY] upstream error (passages):', status, body || '<no body>', { id, reference });
    }
    let error: string | undefined; try { error = (await res.json())?.error; } catch {}
    const mapped = (status === 401 || status === 403)
      ? 'Bible provider rejected the request (check API key / plan / bibleId)'
      : error ?? 'Failed to fetch verse of the day';
    return { ok: false, status, error: mapped };
  }

  try {
    const data = await res.json();
    vodayCache = { dateKey, bibleId: id, payload: data };
    return { ok: true, status, data };
  } catch {
    return { ok: false, status: 502, error: 'Bad response from provider' };
  }
}


/* ========================================================================== */
/* --- NEW: helpers for books/chapters navigation (stable, provider-safe) --- */
/* ========================================================================== */

type ChapterOk = {
  content: string;
  reference: string;
  chapterId: string;
  prevId?: string;
  nextId?: string;
};

async function fetchJsonSafe(res: Response): Promise<any | null> {
  try { return await res.json(); } catch { return null; }
}

async function listBooksRaw(bibleId: string): Promise<{ ok: boolean; status: number; body: any | null }> {
  const r = await apiFetch(`/bibles/${encodeURIComponent(bibleId)}/books`);
  const body = await fetchJsonSafe(r);
  return { ok: r.ok, status: r.status, body };
}

async function listChaptersRaw(bibleId: string, bookId: string): Promise<{ ok: boolean; status: number; body: any | null }> {
  const r = await apiFetch(`/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}/chapters`);
  const body = await fetchJsonSafe(r);
  return { ok: r.ok, status: r.status, body };
}

async function getChapterRaw(bibleId: string, chapterId: string): Promise<{ ok: boolean; status: number; body: any | null }> {
  // No extra query params (provider is strict); default returns HTML content
  const r = await apiFetch(`/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}`);
  const body = await fetchJsonSafe(r);
  return { ok: r.ok, status: r.status, body };
}

/** First chapter id in canonical order (first book -> first chapter). */
async function resolveFirstChapterId(bibleId: string): Promise<ServiceResult<{ chapterId: string }>> {
  const books = await listBooksRaw(bibleId);
  if (!books.ok || !Array.isArray(books.body?.data) || books.body.data.length === 0) {
    return { ok: false, status: books.status, error: 'Unable to list books' };
  }
  const firstBookId = books.body.data[0]?.id as string | undefined;
  if (!firstBookId) return { ok: false, status: 502, error: 'Bad books response' };

  const chapters = await listChaptersRaw(bibleId, firstBookId);
  if (!chapters.ok || !Array.isArray(chapters.body?.data) || chapters.body.data.length === 0) {
    return { ok: false, status: chapters.status, error: 'Unable to list chapters' };
  }
  const firstChapterId = chapters.body.data[0]?.id as string | undefined;
  if (!firstChapterId) return { ok: false, status: 502, error: 'Bad chapters response' };

  return { ok: true, status: 200, data: { chapterId: firstChapterId } };
}

/** Chapter content + neighbor ids within canon order. */
export async function getChapterById(bibleId: string, chapterId: string): Promise<ServiceResult<ChapterOk>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };
  if (!chapterId?.trim()) return { ok: false, status: 400, error: 'Missing chapterId' };

  // Fetch chapter HTML/content
  const chapter = await getChapterRaw(id, chapterId);
  if (!chapter.ok) {
    let errorText: string | undefined;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[CHAPTER] upstream error:', chapter.status, chapter.body ?? '<no body>', { id, chapterId });
    }
    errorText = chapter.body?.error ?? chapter.body?.message;
    return { ok: false, status: chapter.status, error: errorText ?? 'Failed to fetch chapter' };
  }

  // Derive current book id from chapter id (e.g., GEN.1 → GEN)
  const bookId = String(chapterId).split('.')[0];

  // Build prev/next by consulting chapter list for the current book
  const chapters = await listChaptersRaw(id, bookId);
  let prevId: string | undefined;
  let nextId: string | undefined;

  if (chapters.ok && Array.isArray(chapters.body?.data)) {
    const arr: { id: string }[] = chapters.body.data;
    const idx = arr.findIndex((c) => c.id === chapterId);
    if (idx >= 0) {
      if (idx > 0) prevId = arr[idx - 1]?.id;
      if (idx < arr.length - 1) nextId = arr[idx + 1]?.id;
      // If at book boundary, compute across books
      if (!prevId || !nextId) {
        const books = await listBooksRaw(id);
        if (books.ok && Array.isArray(books.body?.data)) {
          const bookIdx = books.body.data.findIndex((b: any) => b.id === bookId);
          if (!prevId && bookIdx > 0) {
            const prevBookId = books.body.data[bookIdx - 1]?.id;
            const prevBookCh = await listChaptersRaw(id, prevBookId);
            if (prevBookCh.ok && Array.isArray(prevBookCh.body?.data) && prevBookCh.body.data.length > 0) {
              prevId = prevBookCh.body.data[prevBookCh.body.data.length - 1]?.id;
            }
          }
          if (!nextId && bookIdx >= 0 && bookIdx < books.body.data.length - 1) {
            const nextBookId = books.body.data[bookIdx + 1]?.id;
            const nextBookCh = await listChaptersRaw(id, nextBookId);
            if (nextBookCh.ok && Array.isArray(nextBookCh.body?.data) && nextBookCh.body.data.length > 0) {
              nextId = nextBookCh.body.data[0]?.id;
            }
          }
        }
      }
    }
  }

  const item = Array.isArray(chapter.body?.data) ? chapter.body.data[0] : chapter.body?.data;
  const content: string = item?.content ?? '';
  const reference: string = item?.reference ?? '';

  if (!content) return { ok: false, status: 502, error: 'Bad chapter response from provider' };

  return {
    ok: true,
    status: 200,
    data: { content, reference, chapterId, prevId, nextId },
  };
}

/** First chapter HTML for a bible (content + neighbors). */
export async function getFirstChapter(bibleId: string): Promise<ServiceResult<ChapterOk>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };

  const firstId = await resolveFirstChapterId(id);
  if (!firstId.ok) return firstId as any;

  return getChapterById(id, (firstId.data as any).chapterId);
}

// --- PUBLIC: list books for a bible (minimal payload) ---
export async function listBooksForBible(bibleId?: string): Promise<ServiceResult<Array<{ id: string; name?: string; abbreviation?: string }>>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };

  const r = await listBooksRaw(id);
  if (!r.ok || !Array.isArray(r.body?.data)) {
    return { ok: false, status: r.status, error: 'Unable to list books' };
  }
  const items = r.body.data.map((b: any) => ({
    id: String(b?.id ?? ''),
    name: typeof b?.name === 'string' ? b.name : undefined,
    abbreviation: typeof b?.abbreviation === 'string' ? b.abbreviation : undefined,
  })).filter((b: any) => b.id);

  return { ok: true, status: 200, data: items };
}

// --- PUBLIC: list chapters for a book (minimal payload) ---
export async function listChaptersForBook(bibleId: string | undefined, bookId: string | undefined): Promise<ServiceResult<Array<{ id: string; number?: number; reference?: string }>>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };
  const bk = bookId?.trim();
  if (!bk) return { ok: false, status: 400, error: 'Missing bookId' };

  const r = await listChaptersRaw(id, bk);
  if (!r.ok || !Array.isArray(r.body?.data)) {
    return { ok: false, status: r.status, error: 'Unable to list chapters' };
  }
  const items = r.body.data.map((c: any) => ({
    id: String(c?.id ?? ''),
    number: typeof c?.number === 'number' ? c.number : (c?.number ? Number(c.number) : undefined),
    reference: typeof c?.reference === 'string' ? c.reference : undefined,
  })).filter((c: any) => c.id);

  return { ok: true, status: 200, data: items };
}
