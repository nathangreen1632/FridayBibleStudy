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
    if (input == null) return null;

    let raw: string | null = null;

    if (typeof input === 'string') {
      raw = input.trim();
    } else if (typeof input === 'number' || typeof input === 'boolean') {
      raw = String(input);
    } else {
      // do not stringify objects/arrays to avoid "[object Object]"
      return null;
    }

    if (!raw) return null;

    const MAX = 512;
    return raw.length > MAX ? raw.slice(0, MAX) : raw;
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

// --- helpers ---------------------------------------------------------------

function getExplicitPrayerId(req: any): number | undefined {
  const explicit = Number(req.body?.prayerId ?? req.query?.prayerId);
  return Number.isFinite(explicit) && explicit > 0 ? Math.floor(explicit) : undefined;
}

async function ensureBinForGroup(groupId: number, userId: number): Promise<number | undefined> {
  const bin = await ensureMediaBinPrayer(groupId, userId);
  return bin?.ok && bin.prayerId ? bin.prayerId : undefined;
}

async function resolveAdminBinTarget(req: any, auth: NarrowAuth): Promise<number | undefined> {
  // 1) ENV single-group fallback (simple single-group setups)
  const envId = Number(process.env.GROUP_ID ?? '');
  if (Number.isFinite(envId) && envId > 0) {
    const fromEnv = await ensureBinForGroup(Math.floor(envId), auth.id);
    if (fromEnv) return fromEnv;
  }

  // 2) Body/query groupId (else auth.groupId); if missing, try DB-backed resolver
  const payloadGroup = Number(req.body?.groupId ?? req.query?.groupId ?? auth.groupId);
  let groupId: number | undefined =
    Number.isFinite(payloadGroup) && payloadGroup > 0 ? Math.floor(payloadGroup) : undefined;

  if (!groupId) {
    const resolved = await resolveAdminUploadGroupId(req, auth.id);
    if (typeof resolved === 'number' && resolved > 0) groupId = resolved;
  }

  if (groupId) {
    const fromPayload = await ensureBinForGroup(groupId, auth.id);
    if (fromPayload) return fromPayload;
  }

  // 3) Last defensive fallback → system group 1
  return ensureBinForGroup(1, auth.id);
}

// Keep return type as number | undefined by normalizing nulls
async function resolveUploadTarget(
  req: any,
  auth: NarrowAuth
): Promise<number | undefined> {
  // Highest priority: explicit prayerId
  const explicit = getExplicitPrayerId(req);
  if (explicit) return explicit;

  // Admin bin resolution (env/payload/db/system)
  if (isAdminRole(auth.role)) {
    const adminTarget = await resolveAdminBinTarget(req, auth);
    if (adminTarget) return adminTarget;
  }

  // Non-admin (or still unresolved): user fallback
  const fallback = await resolveTargetPrayerId(undefined, auth); // number | null
  return (typeof fallback === 'number' && fallback > 0) ? fallback : undefined;
}

function validateFiles(
  req: any
): { ok: true; files: Express.Multer.File[] } | { ok: false; error: string } {
  const files = (req.files as Express.Multer.File[]) || [];
  const check = validateUploadBatch(files);
  if (check.ok) {
    return { ok: true, files };
  }
  // ensure a definite string
  const message = check.error ?? 'Invalid file selection';
  return { ok: false, error: message };
}

// --- POST /api/photos ------------------------------------------------------

router.post(
  '/',
  requireAuth,
  photosUpload.array('files', 4), // matches client FormData 'files'
  async (req, res) => {
    const auth = getAuthedUser(req, res);
    if (!auth) return;

    try {
      // 1) Validate files
      const result = validateFiles(req);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      const { files } = result;

      // 2) Resolve target prayer
      const targetPrayerId = await resolveUploadTarget(req, auth);
      if (!targetPrayerId) {
        console.warn('[photos.controller] no targetPrayerId', {
          userId: auth.id,
          role: auth.role,
          groupId: auth.groupId ?? null,
          bodyGroupId: req.body?.groupId ?? null,
          queryGroupId: req.query?.groupId ?? null,
          envGroupId: process.env.GROUP_ID ?? null,
        });
        res.status(400).json({
          error:
            'No target post found to attach photos. Provide prayerId, or set GROUP_ID for admin Media Bin uploads.',
        });
        return;
      }

      // 3) Persist + respond
      const note = sanitizeNote(req.body?.note);
      const createdIds = await saveUploadedPhotos(files, targetPrayerId, note);

      const items = files.map((f, idx) => ({
        id: createdIds[idx] ?? null,
        url: `/uploads/${f.filename}`,
        filename: f.originalname,
        size: f.size,
        note: note || null,
        prayerId: targetPrayerId,
      }));

      res.status(201).json({ ok: true, items });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[photos.controller] upload error:', err);
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  }
);

export default router;
