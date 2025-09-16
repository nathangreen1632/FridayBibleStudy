// Client/src/jsx/photosPageView.tsx
import React from 'react';
import { Trash } from 'lucide-react';
import LightboxModal from '../../modals/LightboxModalLogic.tsx';
import { pressBtn } from '../../../ui/press.ts';
import type { PhotoItem, FooterNoteFn, TotalPagesFn } from '../../types/domain/photo.types.ts';

type Props = {
  items: PhotoItem[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;

  pendingFiles: File[];
  noteText: string;

  lightboxSrc: string | null;
  lightboxAlt: string;
  lightboxNote: string;

  fileRef: React.Ref<HTMLInputElement>;

  // handlers
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPick: () => void;
  onUpload: () => void;
  onDelete: (id: number) => void;
  openLightbox: (src: string, alt?: string, note?: string | null) => void;
  closeLightbox: () => void;

  setNoteText: (t: string) => void;
  renderFooterNote: FooterNoteFn;
  totalPages: TotalPagesFn;
  goPrev: () => void;
  goNext: () => void;
};

export default function PhotosPageView({
                                         items,
                                         page,
                                         loading,
                                         pendingFiles,
                                         noteText,
                                         lightboxSrc,
                                         lightboxAlt,
                                         lightboxNote,
                                         fileRef,
                                         onFilesSelected,
                                         onPick,
                                         onUpload,
                                         onDelete,
                                         openLightbox,
                                         closeLightbox,
                                         setNoteText,
                                         renderFooterNote,
                                         totalPages,
                                         goPrev,
                                         goNext,
                                       }: Readonly<Props>): React.ReactElement {
  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header / Actions */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-[var(--theme-accent)]">Photos</h1>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Optional note under the photo"
            aria-label="Photo note to display under image"
            className="w-full sm:w-72 px-3 py-2 rounded-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)] border border-[var(--theme-border)]"
          />

          <div className="grid grid-cols-2 gap-2 sm:flex sm:grid-cols-none sm:gap-2">
            <button
              type="button"
              onClick={onPick}
              className={pressBtn("w-full sm:w-auto px-3 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]")}
            >
              Select Photos
            </button>

            <button
              type="button"
              onClick={onUpload}
              disabled={loading || pendingFiles.length === 0}
              className={pressBtn("w-full sm:w-auto px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-pill-orange)] text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-50 disabled:cursor-not-allowed")}
            >
              Upload ({pendingFiles.length || 0})
            </button>
          </div>
        </div>
      </div>

      {pendingFiles.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--theme-card-alt)]">
          <div className="text-sm">
            Ready to upload: <span className="font-semibold">{pendingFiles.length}</span> file(s).
            Limit: 4 images, 10MB total.
          </div>
          {noteText.trim().length > 0 && (
            <div className="text-xs mt-1 opacity-80">
              Note to attach:&nbsp;<span className="italic">“{noteText}”</span>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {items.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <button
              type="button"
              onClick={() => openLightbox(p.url, p.filename, p.note)}
              className="block w-full aspect-[4/3] bg-[var(--theme-card-alt)]"
              aria-label="Open photo"
            >
              <img
                src={p.url}
                alt={p.filename || 'Photo'}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>

            <footer className="flex items-center justify-between gap-2 px-3 py-2 text-xs bg-[var(--theme-hover)] text-[var(--theme-text-white)]">
              <div className="leading-tight">
                <div>Uploaded by {p.uploaderName}</div>
                <div>{new Date(p.createdAt).toLocaleString()}</div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className={pressBtn("inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]")}
                aria-label="Delete photo"
                title="Delete photo"
              >
                <Trash className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </footer>
          </article>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
        <div className="opacity-70">{renderFooterNote()}</div>

        <div className="w-full sm:w-auto grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <button
            onClick={goPrev}
            disabled={loading || page <= 1}
            className={pressBtn("w-full sm:w-auto rounded-lg border border-[var(--theme-border)] px-3 py-2 bg-[var(--theme-pill-orange)] hover:bg-[var(--theme-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed")}
          >
            Prev
          </button>

          <div className="hidden sm:flex sm:col-span-1 sm:mx-2 sm:items-center sm:justify-center">
            Page {page} / {totalPages()}
          </div>

          <button
            onClick={goNext}
            disabled={loading || page >= totalPages()}
            className={pressBtn("w-full sm:w-auto rounded-lg border border-[var(--theme-border)] px-3 py-2 bg-[var(--theme-pill-orange)] hover:bg-[var(--theme-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed")}
          >
            Next
          </button>
        </div>
      </div>

      <LightboxModal
        open={Boolean(lightboxSrc)}
        src={lightboxSrc || ''}
        alt={lightboxAlt}
        caption={lightboxNote}
        onClose={closeLightbox}
      />
    </div>
  );
}
