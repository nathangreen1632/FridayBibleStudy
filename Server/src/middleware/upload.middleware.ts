import multer from 'multer';
import fs from 'fs/promises';
import { env } from '../config/env.config.js';

await fs.mkdir(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, env.UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ok = /image\/(png|jpeg|jpg|webp)/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('Invalid file type'));
};

export const uploadPhotos = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_MB * 1024 * 1024 }, // number
  fileFilter
});
