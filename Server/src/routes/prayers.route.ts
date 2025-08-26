import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { recaptchaRequired } from '../middleware/recaptcha.middleware.js';
import {
  listPrayers,
  createPrayer,
  getPrayer,
  updatePrayer,
  deletePrayer,
  createUpdate,
  addAttachments
} from '../controllers/prayer.controller.js';
import { uploadPhotos } from '../middleware/upload.middleware.js';

const router: Router = Router();

// list/create/read/update/delete
router.get('/', requireAuth, listPrayers);
router.post('/', requireAuth, recaptchaRequired('post_prayer'), createPrayer);
router.get('/:id', requireAuth, getPrayer);
router.patch('/:id', requireAuth, updatePrayer);
router.delete('/:id', requireAuth, deletePrayer);

// updates/comments
router.post('/:id/updates', requireAuth, recaptchaRequired('post_update'), createUpdate);

// photo uploads (moved Multer to middleware)
router.post('/:id/attachments', requireAuth, uploadPhotos.array('photos', 4), addAttachments);

export default router;
