// Client/src/pages/PhotosPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash } from 'lucide-react';
import { usePhotoStore } from '../stores/usePhotoStore';
import LightboxModal from '../modals/LightboxModal';

export default function PhotosPage(): React.ReactElement {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { items, page, pageSize, total, loading, load, upload, remove } = usePhotoStore();

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  useEffect(() => {
    void load(1, pageSize);
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
    const res = await upload(pendingFiles);
    if (res.ok) {
      setPendingFiles([]);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onDelete(id: number) {
    await remove(id);
  }

  function openLightbox(src: string, alt?: string) {
    setLightboxSrc(src);
    setLightboxAlt(alt || 'Photo');
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

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header / Actions */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-extrabold text-[var(--theme-accent)]">Photos</h1>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />
          <button
            type="button"
            onClick={onPick}
            className="px-3 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
          >
            Select Photos
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={loading || pendingFiles.length === 0}
            className="px-3 py-2 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-button-hover)] disabled:opacity-50"
          >
            Upload ({pendingFiles.length || 0})
          </button>
        </div>
      </div>

      {/* Selected preview note */}
      {pendingFiles.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--theme-card-alt)]">
          <div className="text-sm">
            Ready to upload: <span className="font-semibold">{pendingFiles.length}</span> file(s).
            Limit: 4 images, 10MB total.
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className={[
          'grid gap-3',
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        ].join(' ')}
      >
        {items.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Clickable thumbnail opens lightbox */}
            <button
              type="button"
              onClick={() => openLightbox(p.url, p.filename)}
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

            <footer className="flex items-center justify-between px-3 py-2 text-xs bg-[var(--theme-hover)] text-[var(--theme-text-white)]">
              <div className="leading-tight">
                <div>Uploaded by {p.uploaderName}</div>
                <div>{new Date(p.createdAt).toLocaleString()}</div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]"
                aria-label="Delete photo"
                title="Delete photo"
              >
                <Trash className="w-4 h-4" />
                Delete
              </button>
            </footer>
          </article>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6">{renderFooterNote()}</div>

      {/* Lightbox modal */}
      <LightboxModal open={Boolean(lightboxSrc)} src={lightboxSrc || ''} alt={lightboxAlt} onClose={closeLightbox} />
    </div>
  );
}
