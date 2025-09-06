// Server/src/routes/prayers.route.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';
import {
  listPrayers,
  listMyPrayers, // ← ADD
  createPrayer,
  getPrayer,
  updatePrayer,
  deletePrayer,
  createUpdate,
  addAttachments,
} from '../controllers/prayer.controller.js';
import { uploadPhotos } from '../middleware/upload.middleware.js';

const router: Router = Router();

// list/create/read/update/delete
router.get('/', requireAuth, listPrayers);

// NEW: user’s own prayers (no CAPTCHA, read-only)
router.get('/mine', requireAuth, listMyPrayers);

router.post(
  '/',
  requireAuth,
  recaptchaMiddleware, // path-mapped to 'prayer_create'
  createPrayer
);

router.get('/:id', requireAuth, getPrayer);

router.patch(
  '/:id',
  requireAuth,
  recaptchaMiddleware, // path-mapped to 'prayer_update'
  updatePrayer
);

router.delete(
  '/:id',
  requireAuth,
  recaptchaMiddleware, // path-mapped to 'prayer_delete'
  deletePrayer
);

// updates/comments
router.post(
  '/:id/updates',
  requireAuth,
  recaptchaMiddleware, // path-mapped to 'prayer_add_update'
  createUpdate
);

// photo uploads (CAPTCHA before upload to avoid unnecessary I/O)
router.post(
  '/:id/attachments',
  requireAuth,
  recaptchaMiddleware, // path-mapped to 'media_upload'
  uploadPhotos.array('photos', 4),
  addAttachments
);

export default router;
