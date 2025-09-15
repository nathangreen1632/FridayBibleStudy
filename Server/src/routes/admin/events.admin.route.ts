// Server/src/routes/admin/events.admin.route.ts
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

// Admin list (optionally include drafts)
router.get('/', requireAuth, requireAdmin, adminListEvents);

// Create
router.post('/', requireAuth, requireAdmin, recaptchaMiddleware, adminCreateEvent);

// Update
router.patch('/:id', requireAuth, requireAdmin, recaptchaMiddleware, adminUpdateEvent);

// Delete
router.delete('/:id', requireAuth, requireAdmin, recaptchaMiddleware, adminDeleteEvent);

// Email event to roster (admins only; reCAPTCHA protected)
router.post('/:id/email', requireAuth, requireAdmin, recaptchaMiddleware, adminEmailEvent); // ✅ NEW

export default router;
