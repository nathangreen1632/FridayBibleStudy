// Server/src/controllers/photos.controller.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  deletePhotoIfAllowed,
  listPhotoDtos,
  resolveTargetPrayerId,
  saveUploadedPhotos,
  validateUploadBatch,
} from '../services/photos.service.js';
import { photosUpload } from '../middleware/photosUpload.middleware.js';
import { Attachment } from '../models/attachment.model.js';

const router: Router = Router();

function toInt(v: unknown, fallback: number): number {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return fallback;
}

// NEW: sanitize/limit a batch "note" that applies to all uploaded files
function sanitizeNote(input: unknown): string | null {
  try {
    const raw = String(input ?? '').trim();
    if (!raw) return null;
    // keep consistent with model cap; adjust if you switch to TEXT
    const MAX = 512;
    if (raw.length > MAX) return raw.slice(0, MAX);
    return raw;
  } catch {
    return null;
  }
}

/** GET /api/photos?page=&pageSize= */
router.get('/', requireAuth, async (req, res) => {
  const page = toInt(req.query.page, 1);
  const pageSize = toInt(req.query.pageSize, 24);

  try {
    const result = await listPhotoDtos(page, pageSize);
    res.status(200).json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[photos.controller] list error:', err);
    res.status(500).json({ error: 'Failed to load photos' });
  }
});

/** DELETE /api/photos/:id */
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const outcome = await deletePhotoIfAllowed(id, req.user);
    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[photos.controller] delete error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

router.post(
  '/',
  requireAuth,
  photosUpload.array('files', 4), // multer runs first
  async (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const check = validateUploadBatch(files);
      if (!check.ok) {
        res.status(400).json({ error: check.error });
        return;
      }

      const explicit = Number(req.body?.prayerId || req.query?.prayerId);
      const targetPrayerId = await resolveTargetPrayerId(
        Number.isFinite(explicit) ? explicit : undefined,
        req.user
      );
      if (!targetPrayerId) {
        res
          .status(400)
          .json({
            error:
              'No target post found to attach photos. Create a post first or provide a prayerId.',
          });
        return;
      }

      // NEW: single note applies to all uploaded files in this request
      const note = sanitizeNote(req.body?.note);

      // UPDATED: pass note through to service so it can persist on each Attachment
      const createdIds = await saveUploadedPhotos(files, targetPrayerId, note);

      res.status(201).json({ ok: true, ids: createdIds });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[photos.controller] upload error:', err);
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  }
);

export default router;
