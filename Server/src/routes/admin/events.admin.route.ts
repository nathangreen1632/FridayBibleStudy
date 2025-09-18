import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminGuard.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { recaptchaMiddleware } from '../../middleware/recaptcha.middleware.js';
import {
  adminCreateEvent,
  adminDeleteEvent,
  adminListEvents,
  adminUpdateEvent,
  adminEmailEvent, // ✅ add
} from '../../controllers/admin/events.admin.controller.js';

const router: Router = Router();

router.get('/', requireAuth, requireAdmin, adminListEvents);

router.post('/', requireAuth, requireAdmin, recaptchaMiddleware, adminCreateEvent);

router.patch('/:id', requireAuth, requireAdmin, recaptchaMiddleware, adminUpdateEvent);

router.delete('/:id', requireAuth, requireAdmin, recaptchaMiddleware, adminDeleteEvent);

router.post('/:id/email', requireAuth, requireAdmin, recaptchaMiddleware, adminEmailEvent); // ✅ NEW

export default router;
