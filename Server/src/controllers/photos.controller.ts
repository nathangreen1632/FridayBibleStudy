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
import { ensureMediaBinPrayer } from '../services/prayerBin.service.js';
import { resolveAdminUploadGroupId } from '../services/adminUploadTarget.service.js'; // ✅ NEW

const router: Router = Router();

function toInt(v: unknown, fallback: number): number {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return fallback;
}

function sanitizeNote(input: unknown): string | null {
  try {
    const raw = String(input ?? '').trim();
    if (!raw) return null;
    const MAX = 512;
    if (raw.length > MAX) return raw.slice(0, MAX);
    return raw;
  } catch {
    return null;
  }
}

function isAdminRole(role: unknown): boolean {
  if (typeof role !== 'string') return false;
  const r = role.trim().toLowerCase();
  return r === 'admin' || r === 'administrator' || r === 'superadmin';
}

type NarrowAuth = { id: number; role: string; groupId?: unknown };
function getAuthedUser(req: any, res: any): NarrowAuth | null {
  const u = req.user as { id?: number; role?: string; groupId?: unknown } | undefined;
  if (!u || typeof u.id !== 'number') {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return {
    id: u.id,
    role: typeof u.role === 'string' ? u.role : 'user',
    groupId: u.groupId,
  };
}

/** GET /api/photos?page=&pageSize= */
router.get('/', requireAuth, async (req, res) => {
  const page = toInt(req.query.page, 1);
  const pageSize = toInt(req.query.pageSize, 25);

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
  const auth = getAuthedUser(req, res);
  if (!auth) return;

  try {
    const outcome = await deletePhotoIfAllowed(id, auth);
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

/** POST /api/photos (multipart: files[]; optional note, prayerId, groupId) */
router.post(
  '/',
  requireAuth,
  photosUpload.array('files', 4),
  async (req, res) => {
    const auth = getAuthedUser(req, res);
    if (!auth) return;

    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const check = validateUploadBatch(files);
      if (!check.ok) {
        res.status(400).json({ error: check.error });
        return;
      }

      const explicitRaw = req.body?.prayerId ?? req.query?.prayerId;
      const explicit = Number(explicitRaw);
      let targetPrayerId: number | undefined;

      // 1) explicit beats all
      if (Number.isFinite(explicit) && explicit > 0) {
        targetPrayerId = Math.floor(explicit);
      }

      // 2) admin → resolve a *real* group, then ensure Media Bin there
      if (!targetPrayerId && isAdminRole(auth.role)) {
        const resolvedGroupId = await resolveAdminUploadGroupId(req, auth.id); // ✅ now async/DB-backed
        if (typeof resolvedGroupId === 'number' && resolvedGroupId > 0) {
          const bin = await ensureMediaBinPrayer(resolvedGroupId, auth.id);
          if (bin.ok && bin.prayerId) {
            targetPrayerId = bin.prayerId;
          }
        }
        // If still not set, try system group again (defensive)
        if (!targetPrayerId) {
          const bin2 = await ensureMediaBinPrayer(1, auth.id);
          if (bin2.ok && bin2.prayerId) {
            targetPrayerId = bin2.prayerId;
          }
        }
      }

      // 3) non-admin or still unresolved → your existing user fallback
      if (!targetPrayerId) {
        const fallback = await resolveTargetPrayerId(undefined, auth);
        if (fallback) targetPrayerId = fallback;
      }

      if (!targetPrayerId) {
        res.status(400).json({
          error:
            'No target post found to attach photos. Admin uploads should auto-route to Media Bin—verify group membership/availability.',
        });
        return;
      }

      const note = sanitizeNote(req.body?.note);
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
