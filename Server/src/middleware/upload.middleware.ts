// Server/src/middleware/upload.middleware.ts
import multer from 'multer';
import path from 'node:path';
import { getUploadRoot, ensureDirSafe } from '../config/paths.js';

// Resolve once at module load
const UPLOAD_ROOT = getUploadRoot();
await ensureDirSafe(UPLOAD_ROOT); // creates /var/data/fbs-uploads or ./uploads if missing

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const target = UPLOAD_ROOT;

    ensureDirSafe(target)
      .then(() => cb(null, target))
      .catch(() => {
        // Graceful fallback so a transient disk issue doesn’t crash the request
        cb(null, path.resolve(process.cwd(), 'tmp-uploads'));
      });
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});


const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ok = /image\/(png|jpeg|jpg|webp)/i.test(file.mimetype);
  if (ok) {
    cb(null, true);
    return;
  }
  // No throwing per your rules; mark as rejected.
  // Your route can check `req.file` (or `req.files`) and return a friendly message.
  cb(null, false);
};

// Limits: read from env but keep a safe default
const maxMbRaw = Number(process.env.MAX_FILE_MB ?? 25);
const maxMb = Number.isFinite(maxMbRaw) && maxMbRaw > 0 ? Math.floor(maxMbRaw) : 25;
const maxBytes = maxMb * 1024 * 1024;

export const uploadPhotos = multer({
  storage,
  limits: { fileSize: maxBytes },
  fileFilter,
});
