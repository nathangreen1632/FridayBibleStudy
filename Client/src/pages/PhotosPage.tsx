// Client/src/pages/PhotosPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash } from 'lucide-react';
import { usePhotoStore } from '../stores/usePhotoStore';
import LightboxModal from '../modals/LightboxModal';
import { pressBtn } from '../../ui/press';

export default function PhotosPage(): React.ReactElement {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { items, page, pageSize, total, loading, load, upload, remove } = usePhotoStore();

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [noteText, setNoteText] = useState(''); // NEW: batch note input
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');
  const [lightboxNote, setLightboxNote] = useState<string>(''); // NEW

  useEffect(() => {
    let cancelled = false;

    load(1, pageSize).catch(() => {
      if (!cancelled) toast.error('Failed to load photos');
    });

    return () => { cancelled = true; };
  }, [load, pageSize]);

  function onPick() {
    if (fileRef.current) fileRef.current.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const files: File[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const f = list.item(i);
      if (f) files.push(f);
    }
    setPendingFiles(files);
  }

  async function onUpload() {
    if (!pendingFiles.length) {
      toast.error('Please select up to 4 images (≤ 10MB total)');
      return;
    }
    // NEW: pass noteText to upload; store handles trimming + optionality
    const res = await upload(pendingFiles, noteText);
    if (res.ok) {
      setPendingFiles([]);
      setNoteText(''); // reset the note after successful upload
      if (fileRef.current) fileRef.current.value = '';
    } else if (res.message) {
      toast.error(res.message);
    }
  }

  async function onDelete(id: number) {
    await remove(id);
  }

  function openLightbox(src: string, alt?: string, note?: string | null) {
    setLightboxSrc(src);
    setLightboxAlt(alt || 'Photo');
    setLightboxNote((note ?? '').trim());
  }

  function closeLightbox() {
    setLightboxSrc(null);
    setLightboxAlt('');
  }

  function renderFooterNote(): React.ReactElement {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    const text = total > 0 ? `Showing ${start}-${end} of ${total}` : 'No photos yet.';
    return <div className="text-sm opacity-70">{text}</div>;
  }

  function totalPages(): number {
    const denom = pageSize || 1;
    const totalCount = total || 0;
    const pages = Math.ceil(totalCount / denom);
    return Math.max(1, pages);
  }

  async function goPrev() {
    if (page > 1 && !loading) {
      await load(page - 1, pageSize);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function goNext() {
    const tp = totalPages();
    if (page < tp && !loading) {
      await load(page + 1, pageSize);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header / Actions */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-[var(--theme-accent)]">Photos</h1>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          {/* hidden input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          {/* Note (full width on mobile, fixed on desktop) */}
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Optional note under the photo"
            aria-label="Photo note to display under image"
            className="w-full sm:w-72 px-3 py-2 rounded-lg bg-[var(--theme-textbox)] text-[var(--theme-text)] placeholder-[var(--theme-placeholder)] border border-[var(--theme-border)]"
          />

          {/* Buttons: full-width on mobile, inline on desktop */}
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

      {/* Selected preview note */}
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
            {/* Clickable thumbnail opens lightbox */}
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
            aria-label="Previous page of photos"
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
            aria-label="Next page of photos"
          >
            Next
          </button>
        </div>
      </div>

      {/* Lightbox modal */}
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
