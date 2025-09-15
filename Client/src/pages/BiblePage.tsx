// Client/src/pages/BiblePage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchBibleList,
  fetchPassage,
  fetchFirstChapter,
  fetchChapterById,
  fetchBooks,      // tolerant books fetch
  fetchChapters,
} from '../helpers/api/bibleApi';
import { ChevronDown } from 'lucide-react';

type BibleMeta = { id: string; name: string; abbreviationLocal?: string; language?: { name?: string } };
type PassageItem = { content?: string; reference?: string };
type BookMeta = { id: string; name?: string; abbreviation?: string };
type ChapterLite = { id: string; number?: number; reference?: string };

// ------------------- tiny utils -------------------
const LS_KEY = 'biblePageState:v1';
function saveState(partial: Record<string, unknown>) {
  try {
    const prev = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch { /* ignore */ }
}
function readState<T = any>(): T | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') as T | null; } catch { return null; }
}
// ---------------------------------------------------

function pickPassage(body: any): PassageItem | null {
  const newItem = body?.data?.data?.[0];
  if (newItem?.content || newItem?.reference) return newItem;
  const oldItem = body?.data?.passages?.[0];
  if (oldItem?.content || oldItem?.reference) return oldItem;
  const providerDirect = Array.isArray(body?.data) ? body.data?.[0] : undefined;
  if (providerDirect?.content || providerDirect?.reference) return providerDirect;
  return null;
}

function normalizeBibleList(body: any): BibleMeta[] {
  if (Array.isArray(body?.data)) return body.data as BibleMeta[];
  if (Array.isArray(body?.data?.data)) return body.data.data as BibleMeta[];
  if (Array.isArray(body?.data?.bibles)) return body.data.bibles as BibleMeta[];
  return [];
}

function formatBibleLabel(b: BibleMeta): string {
  const parts: string[] = [];
  if (b.abbreviationLocal) parts.push(b.abbreviationLocal);
  if (b.name) parts.push(b.name);
  return parts.length === 2 ? `${parts[0]} – ${parts[1]}` : (parts[0] ?? parts[1] ?? '');
}

export default function BiblePage(): React.ReactElement {
  const [bibles, setBibles] = useState<BibleMeta[]>([]);
  const [loading, setLoading] = useState(false);

  // Restore persisted state (lazy init)
  const initial = readState<{
    bibleId?: string; bookId?: string; chapterId?: string; reference?: string;
  }>() || {};

  const [bibleId, setBibleId] = useState<string>(initial.bibleId ?? '');
  const [reference, setReference] = useState<string>(initial.reference ?? '');
  const [html, setHtml] = useState<string>('');
  const [refText, setRefText] = useState<string>('');

  // chapter mode state
  const [chapterId, setChapterId] = useState<string>(initial.chapterId ?? '');
  const [prevId, setPrevId] = useState<string | undefined>();
  const [nextId, setNextId] = useState<string | undefined>();

  // books dropdown state
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [bookId, setBookId] = useState<string>(initial.bookId ?? '');

  // track previous bibleId so we only clear book when version actually changes
  const prevBibleId = useRef<string>(bibleId);

  // Persist selections
  useEffect(() => { saveState({ bibleId }); }, [bibleId]);
  useEffect(() => { saveState({ bookId }); }, [bookId]);
  useEffect(() => { saveState({ chapterId }); }, [chapterId]);
  useEffect(() => { saveState({ reference }); }, [reference]);

  // Load versions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchBibleList();
        const body = typeof (res as any)?.json === 'function' ? await (res).json() : res;
        if (cancelled) return;
        let items = normalizeBibleList(body);
        items = items.filter((b) => (b?.language?.name || '').toLowerCase().includes('english'));
        setBibles(items);
        if (initial.bibleId && !items.some(i => i.id === initial.bibleId)) {
          setBibleId(''); setBookId(''); setChapterId(''); setHtml(''); setRefText('');
        }
      } catch { if (!cancelled) toast.error('Unable to load Bible versions'); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear everything if the version is cleared
  useEffect(() => {
    if (bibleId) return;
    setBooks([]);
    setBookId('');
    setHtml('');
    setRefText('');
    setChapterId('');
    setPrevId(undefined);
    setNextId(undefined);
  }, [bibleId]);

  /* ================== useCallback: loadChapter ================== */
  const loadChapter = useCallback(
    async (targetId?: string) => {
      if (!targetId || !bibleId) return;
      setLoading(true);
      try {
        const res = await fetchChapterById(targetId, bibleId);
        const body = await res.json();
        const d = body?.data as { content?: string; reference?: string; chapterId?: string; prevId?: string; nextId?: string };
        const c = d?.content ?? '';
        if (!c) { toast.error('No content for that chapter'); return; }
        setHtml(c);
        setRefText(d?.reference ?? '');
        setChapterId(d?.chapterId ?? targetId);
        setPrevId(d?.prevId);
        setNextId(d?.nextId);
        if (reference) setReference('');
      } catch { toast.error('Failed to load chapter'); }
      finally { setLoading(false); }
    },
    [bibleId, reference]
  );

  /* ================== Helpers that depend on loadChapter ================== */
  const applyChapterPayload = useCallback(
    (
      item: { content?: string; reference?: string; chapterId?: string; prevId?: string; nextId?: string } | null,
      isActive: () => boolean
    ) => {
      if (!isActive()) return;

      const c = item?.content ?? '';
      if (!c) {
        setHtml('');
        setRefText('');
        setChapterId('');
        setPrevId(undefined);
        setNextId(undefined);
        return;
      }

      setHtml(c);
      setRefText(item?.reference ?? '');
      setChapterId(item?.chapterId ?? '');
      setPrevId(item?.prevId);
      setNextId(item?.nextId);
    },
    []
  );

  const loadVersionFirstChapter = useCallback(
    async (bId: string, isActive: () => boolean) => {
      const res = await fetchFirstChapter(bId);
      const body = await res.json();
      const item = body?.data as {
        content?: string; reference?: string; chapterId?: string; prevId?: string; nextId?: string
      } | null;
      applyChapterPayload(item, isActive);
    },
    [applyChapterPayload]
  );

  const jumpToFirstChapterOfBook = useCallback(
    async (bkId: string, bId: string, isActive: () => boolean) => {
      const r = await fetchChapters(bkId, bId);
      const body = await r.json();
      const chapters: ChapterLite[] = Array.isArray(body?.data) ? body.data : [];
      const first = chapters[0]?.id;

      if (!first) {
        if (isActive()) toast.error('No chapters in selected book');
        return;
      }
      // loadChapter manages loading state for direct chapter loads
      await loadChapter(first);
    },
    [loadChapter]
  );

  // When the book selection changes:
  // - if a book is chosen -> jump to its first chapter
  // - if cleared (Choose a book…) -> show the version's first chapter
  useEffect(() => {
    if (!bibleId || reference.trim()) return;

    let active = true;
    const isActive = () => active;

    setLoading(true);
    (async () => {
      try {
        if (!bookId) {
          await loadVersionFirstChapter(bibleId, isActive);
          return;
        }
        await jumpToFirstChapterOfBook(bookId, bibleId, isActive);
      } catch {
        if (isActive()) toast.error('Failed to load chapters');
      } finally {
        if (isActive()) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [bookId, bibleId, reference, loadVersionFirstChapter, jumpToFirstChapterOfBook]);

  // Load books for the selected version (don’t clear bookId here)
  useEffect(() => {
    let cancelled = false;

    async function loadBooksForBible() {
      if (!bibleId) { setBooks([]); return; }
      if (reference.trim()) return;

      // If version actually changed, clear previously selected book
      if (prevBibleId.current !== bibleId) {
        setBookId('');
        prevBibleId.current = bibleId;
      }

      const result = await fetchBooks(bibleId); // tolerant path
      if (!result.ok) {
        if (!cancelled) {
          toast.error(result.error ?? `Books request failed (${result.status})`);
          setBooks([]); // reset dropdown clearly on failure
        }
        return;
      }

      const arr: BookMeta[] = Array.isArray(result.data) ? result.data : [];
      if (!cancelled) setBooks(arr);

      // Validate restored selection; if not in list, clear
      if (bookId && !arr.some(b => b.id === bookId)) setBookId('');
    }

    (async () => { await loadBooksForBible(); })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibleId, reference]);

  // (Note: you still have a second effect later that jumps to first chapter on book change.
  // If you keep the refactored effect above, consider removing the later duplicate to avoid double-fetching.)

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!bibleId) { toast.error('Choose a Bible version first'); return; }

    const typed = reference.trim();
    if (!typed) {
      if (!chapterId) toast('Select a version (and optionally a book) to start reading');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchPassage(typed, bibleId);
      const body = typeof (res as any)?.json === 'function' ? await (res).json() : res;
      const picked = pickPassage(body);
      const content = picked?.content ?? '';
      const ref = picked?.reference ?? typed;
      if (!content) { setHtml(''); setRefText(''); toast.error('No content for that reference'); return; }
      setHtml(content);
      setRefText(ref);
      setChapterId('');
      setPrevId(undefined);
      setNextId(undefined);
    } catch { toast.error('Failed to fetch passage'); }
    finally { setLoading(false); }
  }

  const options = useMemo(
    () => bibles.map((b) => ({ id: b.id, label: formatBibleLabel(b) })),
    [bibles]
  );

  // ---- placeholders (no ternaries) ----
  let versionPlaceholder = 'Loading versions…';
  if (bibles.length > 0) versionPlaceholder = 'Choose a version…';

  let bookPlaceholder = 'Choose a version first…';
  if (bibleId) bookPlaceholder = books.length > 0 ? 'Choose a book…' : 'Loading books…';

  return (
    <div className="mx-auto w-full max-w-screen-sm md:max-w-5xl px-3 pb-6 pt-2">
      <div className="sticky top-0 z-10 bg-[var(--theme-surface)]/95 backdrop-blur border border-[var(--theme-border)] rounded-xl p-3 shadow-sm">
        <h1 className="text-xl md:text-2xl font-extrabold mb-2 md:mb-3">Bible</h1>

        <form onSubmit={onSearch} className="flex flex-col gap-2 md:gap-3">
          {/* Version */}
          <label className="sr-only" htmlFor="bible-select">Version</label>
          <div className="relative">
            <select
              id="bible-select"
              value={bibleId}
              onChange={(e) => setBibleId(e.target.value)}
              className="h-12 w-full rounded-lg pr-10 pl-3 bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] focus:outline-none appearance-none"
            >
              <option value="">{versionPlaceholder}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>

            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--theme-placeholder)] opacity-80"
              aria-hidden="true"
            />
          </div>

          {/* Book */}
          <label className="sr-only" htmlFor="book-select">Book</label>
          <div className="relative">
            <select
              id="book-select"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              disabled={!bibleId || !books.length || !!reference.trim()}
              className="h-12 w-full rounded-lg pr-10 pl-3 bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] focus:outline-none disabled:opacity-60 appearance-none"
            >
              <option value="">{bookPlaceholder}</option>
              {books.map((b) => {
                const label = b.abbreviation && b.name
                  ? `${b.abbreviation} – ${b.name}`
                  : (b.abbreviation ?? b.name ?? b.id);
                return <option key={b.id} value={b.id}>{label}</option>;
              })}
            </select>

            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--theme-placeholder)] opacity-80"
              aria-hidden="true"
            />
          </div>

          <div className="flex gap-2">
            <label className="sr-only" htmlFor="reference-input">Reference</label>
            <input
              id="reference-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional: John 3:16 • Psalm 23 • Gen 1"
              className="flex-1 h-12 rounded-lg px-3 bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] focus:outline-none placeholder:text-[var(--theme-placeholder)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-4 rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Read'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-3 md:mt-4 bg-[var(--theme-accent)] border border-[var(--theme-border)] rounded-xl p-4 md:p-5">
        {html ? (
          <div className="scripture-styles prose prose-sm md:prose max-w-none eb-container text-xl custom-scrollbar">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <div className="text-sm md:text-base">
            Choose a version to start reading, optionally select a book, or type a reference and tap Read.
          </div>
        )}

        {chapterId && (
          <>
            <div className="hidden md:flex items-center gap-2 mt-3">
              <button
                type="button"
                disabled={!prevId || loading}
                onClick={() => loadChapter(prevId)}
                className="h-11 px-3 rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] disabled:opacity-50"
              >
                ◀ Prev
              </button>
              <div className="text-sm opacity-80 select-none truncate">{refText || chapterId}</div>
              <button
                type="button"
                disabled={!nextId || loading}
                onClick={() => loadChapter(nextId)}
                className="h-11 px-3 rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] disabled:opacity-50"
              >
                Next ▶
              </button>
            </div>

            <div className="md:hidden mt-3">
              <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm flex items-center justify-between gap-2 px-2 py-2">
                <button
                  type="button"
                  disabled={!prevId || loading}
                  onClick={() => loadChapter(prevId)}
                  className="h-12 px-4 rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] disabled:opacity-50"
                  aria-label="Previous chapter"
                >
                  ◀
                </button>
                <div className="text-xs text-center flex-1 px-2 truncate">{refText || chapterId}</div>
                <button
                  type="button"
                  disabled={!nextId || loading}
                  onClick={() => loadChapter(nextId)}
                  className="h-12 px-4 rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] disabled:opacity-50"
                  aria-label="Next chapter"
                >
                  ▶
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
