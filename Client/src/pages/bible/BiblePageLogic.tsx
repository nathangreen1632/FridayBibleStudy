// Client/src/pages/BiblePageLogic.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchBibleList,
  fetchPassage,
  fetchFirstChapter,
  fetchChapterById,
  fetchBooks,
  fetchChapters,
} from '../../helpers/api/bibleApi.ts';
import BiblePageView from '../../jsx/bible/biblePageView.tsx';
import {
  saveState,
  readState,
  pickPassage,
  normalizeBibleList,
  formatBibleLabel,
} from '../../helpers/biblePage.helper.ts';
import type { BibleMeta, BookMeta, ChapterLite, VersionOption } from '../../types/domain/bible.types.ts';

export default function BiblePage(): React.ReactElement {
  const [bibles, setBibles] = useState<BibleMeta[]>([]);
  const [loading, setLoading] = useState(false);

  // Restore persisted state (lazy init)
  const initial =
    readState<{ bibleId?: string; bookId?: string; chapterId?: string; reference?: string }>() || {};

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

  // Load versions once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchBibleList();
        const body = typeof (res as any)?.json === 'function' ? await (res as any).json() : res;
        if (cancelled) return;

        let items = normalizeBibleList(body);
        items = items.filter((b) => (b?.language?.name || '').toLowerCase().includes('english'));
        setBibles(items);

        if (initial.bibleId && !items.some((i) => i.id === initial.bibleId)) {
          setBibleId('');
          setBookId('');
          setChapterId('');
          setHtml('');
          setRefText('');
        }
      } catch {
        if (!cancelled) toast.error('Unable to load Bible versions');
      }
    })();
    return () => {
      cancelled = true;
    };
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

  /* ================== loadChapter ================== */
  const loadChapter = useCallback(
    async (targetId?: string) => {
      if (!targetId || !bibleId) return;
      setLoading(true);
      try {
        const res = await fetchChapterById(targetId, bibleId);
        const body = await res.json();
        const d = body?.data as {
          content?: string;
          reference?: string;
          chapterId?: string;
          prevId?: string;
          nextId?: string;
        };
        const c = d?.content ?? '';
        if (!c) {
          toast.error('No content for that chapter');
          return;
        }
        setHtml(c);
        setRefText(d?.reference ?? '');
        setChapterId(d?.chapterId ?? targetId);
        setPrevId(d?.prevId);
        setNextId(d?.nextId);
        if (reference) setReference('');
      } catch {
        toast.error('Failed to load chapter');
      } finally {
        setLoading(false);
      }
    },
    [bibleId, reference]
  );

  /* ================== Helpers that depend on loadChapter ================== */
  const applyChapterPayload = useCallback(
    (
      item:
        | { content?: string; reference?: string; chapterId?: string; prevId?: string; nextId?: string }
        | null,
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
        content?: string;
        reference?: string;
        chapterId?: string;
        prevId?: string;
        nextId?: string;
      } | null;
      applyChapterPayload(item, isActive);
    },
    [applyChapterPayload]
  );

  const jumpToFirstChapterOfBook = useCallback(
    async (bkId: string, bId: string, _isActive: () => boolean) => {
      const r = await fetchChapters(bkId, bId);
      const body = await r.json();
      const chapters: ChapterLite[] = Array.isArray(body?.data) ? body.data : [];
      const first = chapters[0]?.id;

      if (!first) {
        toast.error('No chapters in selected book');
        return;
      }
      // loadChapter manages loading state for direct chapter loads
      await loadChapter(first);
    },
    [loadChapter]
  );

  // When the book selection changes:
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

    return () => {
      active = false;
    };
  }, [bookId, bibleId, reference, loadVersionFirstChapter, jumpToFirstChapterOfBook]);

  // Load books for the selected version (don’t clear bookId here)
  useEffect(() => {
    let cancelled = false;

    async function loadBooksForBible() {
      if (!bibleId) {
        setBooks([]);
        return;
      }
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
      if (bookId && !arr.some((b) => b.id === bookId)) setBookId('');
    }

    (async () => {
      await loadBooksForBible();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibleId, reference]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!bibleId) {
      toast.error('Choose a Bible version first');
      return;
    }

    const typed = reference.trim();
    if (!typed) {
      if (!chapterId) toast('Select a version (and optionally a book) to start reading');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchPassage(typed, bibleId);
      const body = typeof (res as any)?.json === 'function' ? await (res as any).json() : res;
      const picked = pickPassage(body);
      const content = picked?.content ?? '';
      const ref = picked?.reference ?? typed;
      if (!content) {
        setHtml('');
        setRefText('');
        toast.error('No content for that reference');
        return;
      }
      setHtml(content);
      setRefText(ref);
      setChapterId('');
      setPrevId(undefined);
      setNextId(undefined);
    } catch {
      toast.error('Failed to fetch passage');
    } finally {
      setLoading(false);
    }
  }

  const versionOptions: VersionOption[] = useMemo(
    () => bibles.map((b) => ({ id: b.id, label: formatBibleLabel(b) })),
    [bibles]
  );

  // ---- placeholders (no ternaries in the view) ----
  let versionPlaceholder = 'Loading versions…';
  if (bibles.length > 0) versionPlaceholder = 'Choose a version…';

  let bookPlaceholder = 'Choose a version first…';
  if (bibleId) bookPlaceholder = books.length > 0 ? 'Choose a book…' : 'Loading books…';

  return (
    <BiblePageView
      loading={loading}
      bibleId={bibleId}
      bookId={bookId}
      reference={reference}
      versionOptions={versionOptions}
      books={books}
      versionPlaceholder={versionPlaceholder}
      bookPlaceholder={bookPlaceholder}
      onSelectBible={(id) => setBibleId(id)}
      onSelectBook={(id) => setBookId(id)}
      onReferenceChange={(next) => setReference(next)}
      onSubmit={onSearch}
      html={html}
      chapterId={chapterId}
      refText={refText}
      prevId={prevId}
      nextId={nextId}
      onLoadPrev={() => { void loadChapter(prevId); }}
      onLoadNext={() => { void loadChapter(nextId); }}
    />
  );
}
