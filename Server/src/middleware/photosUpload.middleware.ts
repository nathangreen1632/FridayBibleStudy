// Server/src/middleware/photosUpload.middleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.config.js';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR || 'uploads');

function ensureUploadsDir() {
  try {
    fs.mkdirSync(uploadRoot, { recursive: true });
  } catch {
    // graceful fallback: ignore if already exists or no permission
  }
}

ensureUploadsDir();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    const ts = Date.now();
    // replace anything not alphanumeric, dot, underscore, or dash
    const safe = file.originalname.replace(/[^\w.-]+/g, '_');
    cb(null, `${ts}_${safe}`);
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
    files: 4,                  // hard cap by server
    fileSize: 10 * 1024 * 1024, // per-file cap fallback (also checked elsewhere)
  },
});
