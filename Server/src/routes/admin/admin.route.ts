// Server/src/routes/admin.route.ts
import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminGuard.middleware.js';
import { recaptchaMiddleware } from '../../middleware/recaptcha.middleware.js';
import {
  promoteUser,
  listPrayers,
  getPrayerThread,
  addAdminComment,
  setPrayerStatus,
  demoteUser,
  getPrayerDetail,
} from '../../controllers/admin/admin.controller.js';

// NEW: bring in deletePrayer from your prayer.controller
import { deletePrayer } from '../../controllers/prayer.controller.js';

const router: Router = Router();

// Existing
router.post('/promote', requireAdmin, recaptchaMiddleware, promoteUser);
router.post('/demote', requireAdmin, recaptchaMiddleware, demoteUser);

// NEW: admin portal endpoints
router.get('/prayers', requireAdmin, listPrayers);
router.get('/prayers/:prayerId', requireAdmin, getPrayerDetail);
router.get('/prayers/:prayerId/comments', requireAdmin, getPrayerThread);
router.post('/prayers/:prayerId/comments', requireAdmin, recaptchaMiddleware, addAdminComment);
router.patch('/prayers/:prayerId/status', requireAdmin, recaptchaMiddleware, setPrayerStatus);

// NEW: hard delete prayer (admin only)
router.delete('/prayers/:id', requireAdmin, recaptchaMiddleware, deletePrayer);

export default router;
