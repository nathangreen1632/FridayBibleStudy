// Client/src/jsx/biblePageView.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { VersionOption, BookMeta } from '../../types/domain/bible.types.ts';

type Props = {
  loading: boolean;

  // selects + inputs
  bibleId: string;
  bookId: string;
  reference: string;

  versionOptions: VersionOption[];
  books: BookMeta[];

  // placeholders (precomputed to avoid ternaries here)
  versionPlaceholder: string;
  bookPlaceholder: string;

  // handlers
  onSelectBible: (id: string) => void;
  onSelectBook: (id: string) => void;
  onReferenceChange: (next: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;

  // content
  html: string;
  chapterId: string;
  refText: string;
  prevId?: string;
  nextId?: string;

  onLoadPrev: () => void;
  onLoadNext: () => void;
};

export default function BiblePageView({
                                        loading,
                                        bibleId,
                                        bookId,
                                        reference,
                                        versionOptions,
                                        books,
                                        versionPlaceholder,
                                        bookPlaceholder,
                                        onSelectBible,
                                        onSelectBook,
                                        onReferenceChange,
                                        onSubmit,
                                        html,
                                        chapterId,
                                        refText,
                                        prevId,
                                        nextId,
                                        onLoadPrev,
                                        onLoadNext,
                                      }: Readonly<Props>): React.ReactElement {
  const bookSelectDisabled =
    !bibleId || books.length === 0 || reference.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-screen-sm md:max-w-5xl px-3 pb-6 pt-2">
      <div className="sticky top-0 z-10 bg-[var(--theme-accent)] backdrop-blur border border-[var(--theme-border)] rounded-xl p-3 shadow-sm">
        <h1 className="text-xl md:text-2xl font-extrabold text-[var(--theme-verse)] mb-2 md:mb-3">
          Bible
        </h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 md:gap-3">
          {/* Version */}
          <label className="sr-only" htmlFor="bible-select">Version</label>
          <div className="relative">
            <select
              id="bible-select"
              value={bibleId}
              onChange={(e) => onSelectBible(e.target.value)}
              className="h-12 w-full rounded-lg pr-10 pl-3 bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] focus:outline-none appearance-none"
            >
              <option value="">{versionPlaceholder}</option>
              {versionOptions.map((o) => (
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
              onChange={(e) => onSelectBook(e.target.value)}
              disabled={bookSelectDisabled}
              className="h-12 w-full rounded-lg pr-10 pl-3 bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] focus:outline-none disabled:opacity-60 appearance-none"
            >
              <option value="">{bookPlaceholder}</option>
              {books.map((b) => {
                const label =
                  b.abbreviation && b.name
                    ? `${b.abbreviation} – ${b.name}`
                    : (b.abbreviation ?? b.name ?? b.id);
                return (
                  <option key={b.id} value={b.id}>
                    {label}
                  </option>
                );
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
              onChange={(e) => onReferenceChange(e.target.value)}
              placeholder="Optional: John 3:16 • Psalm 23 • Gen 1"
              className="flex-1 h-12 rounded-lg px-3 bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] focus:outline-none placeholder:text-[var(--theme-placeholder)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-4 rounded-xl bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60"
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
                onClick={onLoadPrev}
                className="h-11 px-3 rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] disabled:opacity-50"
              >
                ◀ Prev
              </button>
              <div className="text-sm opacity-80 select-none truncate">
                {refText || chapterId}
              </div>
              <button
                type="button"
                disabled={!nextId || loading}
                onClick={onLoadNext}
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
                  onClick={onLoadPrev}
                  className="h-12 px-4 rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] disabled:opacity-50"
                  aria-label="Previous chapter"
                >
                  ◀
                </button>
                <div className="text-xs text-center flex-1 px-2 truncate">
                  {refText || chapterId}
                </div>
                <button
                  type="button"
                  disabled={!nextId || loading}
                  onClick={onLoadNext}
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
