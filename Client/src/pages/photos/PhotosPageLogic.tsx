// Client/src/pages/PhotosPageLogic.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { usePhotoStore } from '../stores/usePhotoStore';
import PhotosPageView from '../jsx/photos/photosPageView.tsx';
import type { PhotoItem } from '../types/domain/photo.types.ts';

export default function PhotosPage(): React.ReactElement {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { items, page, pageSize, total, loading, load, upload, remove } = usePhotoStore();

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [noteText, setNoteText] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');
  const [lightboxNote, setLightboxNote] = useState<string>('');

  const setFileInputRef = useCallback((el: HTMLInputElement | null) => {
    fileRef.current = el;
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(1, pageSize).catch(() => {
      if (!cancelled) toast.error('Failed to load photos');
    });
    return () => { cancelled = true; };
  }, [load, pageSize]);

  function onPick() {
    fileRef.current?.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const files: File[] = [];
    for (let i = 0; i < list.length; i++) {
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
    const res = await upload(pendingFiles, noteText);
    if (res.ok) {
      setPendingFiles([]);
      setNoteText('');
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
    <PhotosPageView
      items={items as PhotoItem[]}
      page={page}
      pageSize={pageSize}
      total={total}
      loading={loading}
      pendingFiles={pendingFiles}
      noteText={noteText}
      lightboxSrc={lightboxSrc}
      lightboxAlt={lightboxAlt}
      lightboxNote={lightboxNote}
      fileRef={setFileInputRef}
      onFilesSelected={onFilesSelected}
      onPick={onPick}
      onUpload={onUpload}
      onDelete={onDelete}
      openLightbox={openLightbox}
      closeLightbox={closeLightbox}
      setNoteText={setNoteText}
      renderFooterNote={renderFooterNote}
      totalPages={totalPages}
      goPrev={goPrev}
      goNext={goNext}
    />
  );
}
