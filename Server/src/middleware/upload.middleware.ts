import multer from 'multer';
import path from 'node:path';
import { getUploadRoot, ensureDirSafe } from '../config/paths.js';

const UPLOAD_ROOT = getUploadRoot();
await ensureDirSafe(UPLOAD_ROOT);

const ALLOWED_MIME = /image\/(png|jpe?g|webp|heic|heif)$/i;

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const target = UPLOAD_ROOT;

    ensureDirSafe(target)
      .then(() => cb(null, target))
      .catch(() => {
        cb(null, path.resolve(process.cwd(), 'tmp-uploads'));
      });
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME.test(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(null, false);
};

const maxMbRaw = Number(process.env.MAX_FILE_MB ?? 25);
const maxMb = Number.isFinite(maxMbRaw) && maxMbRaw > 0 ? Math.floor(maxMbRaw) : 25;
const maxBytes = maxMb * 1024 * 1024;

export const uploadPhotos = multer({
  storage,
  limits: { fileSize: maxBytes },
  fileFilter,
});

