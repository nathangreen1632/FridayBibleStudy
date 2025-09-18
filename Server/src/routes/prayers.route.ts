import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';
import {
  listPrayers,
  listMyPrayers,
  createPrayer,
  getPrayer,
  updatePrayer,
  deletePrayer,
  createUpdate,
  addAttachments,
} from '../controllers/prayer.controller.js';
import { uploadPhotos } from '../middleware/upload.middleware.js';

const router: Router = Router();

router.get('/', requireAuth, listPrayers);

router.get('/mine', requireAuth, listMyPrayers);

router.post('/', requireAuth, recaptchaMiddleware, createPrayer);

router.get('/:id', requireAuth, getPrayer);

router.patch('/:id', requireAuth, recaptchaMiddleware, updatePrayer);

router.delete('/:id', requireAuth, recaptchaMiddleware, deletePrayer);

router.post('/:id/updates', requireAuth, recaptchaMiddleware, createUpdate);


router.post('/:id/attachments', requireAuth, recaptchaMiddleware, uploadPhotos.array('photos', 4), addAttachments);

export default router;
