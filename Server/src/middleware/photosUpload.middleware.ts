import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadRoot = path.resolve(process.cwd(), 'uploads');

function ensureUploadsDir() {
  try {
    fs.mkdirSync(uploadRoot, { recursive: true });
  } catch {
    // no-op; graceful
  }
}

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  // images only
  if (!file.mimetype?.startsWith('image/')) {
    cb(null, false);
    return;
  }
  cb(null, true);
}

export const photosUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 4,                 // hard cap by server
    fileSize: 10 * 1024 * 1024, // per-file cap fallback (we’ll also check total)
  },
});
