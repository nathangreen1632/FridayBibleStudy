// Server/src/middleware/upload.middleware.ts
import multer from 'multer';
import path from 'node:path';
import { getUploadRoot, ensureDirSafe } from '../config/paths.js';

// Resolve once at module load (ok with Node 22)
const UPLOAD_ROOT = getUploadRoot();
await ensureDirSafe(UPLOAD_ROOT); // creates /var/data/fbs-uploads or ./uploads if missing

// Allow common image formats incl. iPhone HEIC/HEIF
const ALLOWED_MIME = /image\/(png|jpe?g|webp|heic|heif)$/i;

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const target = UPLOAD_ROOT;

    // Keep this non-async so Sonar doesn't complain about Promise-returning
    ensureDirSafe(target)
      .then(() => cb(null, target))
      .catch(() => {
        // Graceful fallback so a transient disk issue doesn’t crash the request
        cb(null, path.resolve(process.cwd(), 'tmp-uploads'));
      });
  },
  filename(_req, file, cb) {
    // Keep original extension; sanitize filename
    const safe = file.originalname.replace(/[^\w.-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME.test(file.mimetype)) {
    cb(null, true);
    return;
  }
  // No throwing per your rules; mark as rejected.
  // Route should check req.file/req.files and respond with a friendly message.
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

// Optional: translate Multer errors into friendly 400s without throwing
export function handleMulterErrors(
  err: unknown,
  _req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): void {
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code) {
    let message = 'Upload failed.';
    if (anyErr.code === 'LIMIT_FILE_SIZE') {
      message = `File too large. Max ${maxMb}MB per file.`;
    } else if (anyErr.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }
    res.status(400).json({ ok: false, error: message });
    return;
  }
  next(err as never);
}
