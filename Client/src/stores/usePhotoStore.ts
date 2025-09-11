// Client/src/stores/usePhotoStore.ts
import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { Photo, PhotoListResponse } from '../types/photo.types';
import { fetchPhotos, uploadPhotos, deletePhoto } from '../helpers/api/photoApi';
import { compressImage } from '../utils/imageCompress';

type State = {
  items: Photo[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;

  load: (
    page?: number,
    pageSize?: number,
    recaptchaToken?: string
  ) => Promise<{ ok: boolean; message?: string }>;

  // ✅ updated: allow an optional note to be attached to this batch
  upload: (
    files: File[],
    note?: string,
    recaptchaToken?: string
  ) => Promise<{ ok: boolean; message?: string }>;

  remove: (photoId: number, recaptchaToken?: string) => Promise<{ ok: boolean; message?: string }>;
};

function summarizeError(res: Response | undefined): string {
  if (!res) return 'Network error';
  return `Error ${res.status}`;
}

// ✅ compress a batch before enforcing size limits
async function compressBatch(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    try {
      const small = await compressImage(f, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
        output: 'image/jpeg',
      });
      out.push(small);
    } catch {
      out.push(f); // graceful fallback
    }
  }
  return out;
}

export const usePhotoStore = create<State>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  loading: false,

  async load(page = 1, pageSize = 25, recaptchaToken?: string) {
    set({ loading: true });
    try {
      const res = await fetchPhotos(page, pageSize, recaptchaToken);
      if (!res.ok) {
        const message = summarizeError(res);
        toast.error(message);
        set({ loading: false });
        return { ok: false, message };
      }
      const data = (await res.json()) as PhotoListResponse;
      set({
        items: Array.isArray(data.items) ? data.items : [],
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        loading: false,
      });
      return { ok: true };
    } catch {
      const message = 'Failed to load photos';
      toast.error(message);
      set({ loading: false });
      return { ok: false, message };
    }
  },

  // ✅ updated signature: (files, note?, recaptchaToken?)
  async upload(files: File[], note?: string, recaptchaToken?: string) {
    const MAX_FILES = 4;
    const MAX_BYTES = 10 * 1024 * 1024;

    if (!files.length) {
      return { ok: false, message: 'No files selected' };
    }
    if (files.length > MAX_FILES) {
      toast.error(`You can upload up to ${MAX_FILES} photos at once`);
      return { ok: false, message: 'Too many files' };
    }

    set({ loading: true });
    try {
      // ✅ compress first, then enforce total size on the compressed batch
      const compressed = await compressBatch(files);
      const totalBytes = compressed.reduce((acc, f) => acc + (f.size || 0), 0);
      if (totalBytes > MAX_BYTES) {
        toast.error('Total upload size must be 10MB or less');
        set({ loading: false });
        return { ok: false, message: 'Upload too large' };
      }

      // ✅ pass note + recaptcha to helper as options (note is trimmed + optional)
      const opts: { note?: string; recaptchaToken?: string } = {};
      if (note && note.trim().length > 0) opts.note = note.trim();
      if (recaptchaToken) opts.recaptchaToken = recaptchaToken;

      const res = await uploadPhotos(compressed, opts);
      if (!res.ok) {
        const message = summarizeError(res);
        toast.error(message);
        set({ loading: false });
        return { ok: false, message };
      }

      toast.success('Photos uploaded');
      const s = get();
      await s.load(s.page, s.pageSize, recaptchaToken);
      return { ok: true };
    } catch {
      const message = 'Failed to upload';
      toast.error(message);
      set({ loading: false });
      return { ok: false, message };
    }
  },

  async remove(photoId: number, recaptchaToken?: string) {
    set({ loading: true });
    try {
      const res = await deletePhoto(photoId, recaptchaToken);
      if (!res.ok) {
        const message = summarizeError(res);
        toast.error(message);
        set({ loading: false });
        return { ok: false, message };
      }
      const s = get();
      const next = s.items.filter((p) => p.id !== photoId);
      set({ items: next, total: Math.max(0, s.total - 1), loading: false });
      toast.success('Photo deleted');
      return { ok: true };
    } catch {
      const message = 'Failed to delete';
      toast.error(message);
      set({ loading: false });
      return { ok: false, message };
    }
  },
}));
