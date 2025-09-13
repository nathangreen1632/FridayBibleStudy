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

// put near the top of bible.service.ts
type JsonObj = Record<string, unknown>;


// safer JSON helper (no `any`)
async function fetchJsonSafe(res: Response): Promise<JsonObj | null> {
  try {
    return (await res.json()) as JsonObj;
  } catch {
    return null;
  }
}

// raw fetchers — return { body: JsonObj | null } instead of `any | null`
async function listBooksRaw(
  bibleId: string
): Promise<{ ok: boolean; status: number; body: JsonObj | null }> {
  const r = await apiFetch(`/bibles/${encodeURIComponent(bibleId)}/books`);
  const body = await fetchJsonSafe(r);
  return { ok: r.ok, status: r.status, body };
}

async function listChaptersRaw(
  bibleId: string,
  bookId: string
): Promise<{ ok: boolean; status: number; body: JsonObj | null }> {
  const r = await apiFetch(
    `/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}/chapters`
  );
  const body = await fetchJsonSafe(r);
  return { ok: r.ok, status: r.status, body };
}

async function getChapterRaw(
  bibleId: string,
  chapterId: string
): Promise<{ ok: boolean; status: number; body: JsonObj | null }> {
  const r = await apiFetch(
    `/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}`
  );
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

// --- helpers ---------------------------------------------------------------

function badUpstream<T = never>(status: number, body: any, msg = 'Failed to fetch chapter'): ServiceResult<T> {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[CHAPTER] upstream error:', status, body ?? '<no body>');
  }
  const errorText: string | undefined = body?.error ?? body?.message;
  return { ok: false, status, error: errorText ?? msg };
}

function pickChapterItem(body: any): { content?: string; reference?: string } {
  const item = Array.isArray(body?.data) ? body.data[0] : body?.data;
  return {
    content: item?.content,
    reference: item?.reference,
  };
}

function sameBookNeighbors(chapterIds: Array<{ id: string }>, chapterId: string) {
  const idx = chapterIds.findIndex((c) => c.id === chapterId);
  if (idx < 0) return { prev: undefined, next: undefined };

  const prev = idx > 0 ? chapterIds[idx - 1]?.id : undefined;
  const next = idx < chapterIds.length - 1 ? chapterIds[idx + 1]?.id : undefined;
  return { prev, next };
}

// add these tiny helpers near the other helpers in bible.service.ts
function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v === null || v === undefined) return undefined;
  const n = Number(v as any);
  return Number.isFinite(n) ? n : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}


async function crossBookNeighbors(
  bibleId: string,
  bookId: string,
  wantPrev: boolean,
  wantNext: boolean
): Promise<{ prev?: string; next?: string }> {
  if (!wantPrev && !wantNext) return {};

  const books = await listBooksRaw(bibleId);
  if (!books.ok || !Array.isArray(books.body?.data)) return {};

  const list: Array<{ id: string }> = books.body.data;
  const i = list.findIndex((b) => b.id === bookId);
  if (i < 0) return {};

  let prev: string | undefined;
  let next: string | undefined;

  if (wantPrev && i > 0) {
    const prevBookId = list[i - 1]?.id;
    const prevCh = await listChaptersRaw(bibleId, prevBookId);
    if (prevCh.ok && Array.isArray(prevCh.body?.data) && prevCh.body.data.length > 0) {
      prev = prevCh.body.data[prevCh.body.data.length - 1]?.id;
    }
  }

  if (wantNext && i < list.length - 1) {
    const nextBookId = list[i + 1]?.id;
    const nextCh = await listChaptersRaw(bibleId, nextBookId);
    if (nextCh.ok && Array.isArray(nextCh.body?.data) && nextCh.body.data.length > 0) {
      next = nextCh.body.data[0]?.id;
    }
  }

  return { prev, next };
}

async function computeNeighbors(
  bibleId: string,
  chapterId: string
): Promise<{ prevId?: string; nextId?: string }> {
  const bookId = String(chapterId).split('.')[0];

  const chapters = await listChaptersRaw(bibleId, bookId);
  if (!chapters.ok || !Array.isArray(chapters.body?.data)) {
    return {};
  }

  const { prev, next } = sameBookNeighbors(chapters.body.data, chapterId);
  if (prev && next) return { prevId: prev, nextId: next };

  // fill across book boundaries only for the missing side(s)
  const cross = await crossBookNeighbors(bibleId, bookId, !prev, !next);
  return { prevId: prev ?? cross.prev, nextId: next ?? cross.next };
}

// --- refactor --------------------------------------------------------------

export async function getChapterById(
  bibleId: string,
  chapterId: string
): Promise<ServiceResult<ChapterOk>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };
  if (!chapterId?.trim()) return { ok: false, status: 400, error: 'Missing chapterId' };

  // 1) fetch chap content
  const chapter = await getChapterRaw(id, chapterId);
  if (!chapter.ok) {
    return badUpstream(chapter.status, chapter.body);
  }

  // 2) neighbors (same book, then cross-book if needed)
  const { prevId, nextId } = await computeNeighbors(id, chapterId);

  // 3) normalize payload
  const { content, reference } = pickChapterItem(chapter.body);
  if (!content) return { ok: false, status: 502, error: 'Bad chapter response from provider' };

  return { ok: true, status: 200, data: { content, reference: reference ?? '', chapterId, prevId, nextId } };
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
export async function listChaptersForBook(
  bibleId: string | undefined,
  bookId: string | undefined
): Promise<ServiceResult<Array<{ id: string; number?: number; reference?: string }>>> {
  const id = bibleId?.trim() || (env.BIBLE_DEFAULT_BIBLE_ID ?? '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing bibleId and no default configured' };

  const bk = bookId?.trim();
  if (!bk) return { ok: false, status: 400, error: 'Missing bookId' };

  const r = await listChaptersRaw(id, bk);
  if (!r.ok || !Array.isArray(r.body?.data)) {
    return { ok: false, status: r.status, error: 'Unable to list chapters' };
  }

  const items =
    (r.body?.data as unknown[] | undefined)
      ?.map((c: any) => {
        const idStr = c?.id != null ? String(c.id) : '';

        const item: { id: string; number?: number; reference?: string } = { id: idStr };

        const num = asFiniteNumber(c?.number);
        if (num !== undefined) item.number = num;

        const ref = asString(c?.reference);
        if (ref !== undefined) item.reference = ref;

        return item;
      })
      ?.filter((c: any) => Boolean(c.id)) ?? [];

  return { ok: true, status: 200, data: items };
}

