// Server/src/routes/admin.route.ts
import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminGuard.middleware.js';
import { recaptchaMiddleware } from '../../middleware/recaptcha.middleware.js';
import { getAdminRoster, patchAdminRosterUser, deleteAdminRosterUser } from '../../controllers/admin/roster.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  promoteUser,
  listPrayers,
  getPrayerThread,
  addAdminComment,
  setPrayerStatus,
  demoteUser,
  getPrayerDetail,
} from '../../controllers/admin/admin.controller.js';
import { previewDigest, sendAutoDigest, sendManualDigest } from '../../controllers/admin/digest.controller.js';


// NEW: bring in deletePrayer from your prayer.controller
import { deletePrayer } from '../../controllers/prayer.controller.js';

const router: Router = Router();

// Existing
router.post('/promote', requireAdmin, recaptchaMiddleware, promoteUser);
router.post('/demote', requireAdmin, recaptchaMiddleware, demoteUser);
router.post('/digests/preview', requireAuth, requireAdmin, previewDigest);
router.post('/digests/send-auto', requireAuth, requireAdmin, sendAutoDigest);
router.post('/digests/send-manual', requireAuth, requireAdmin, sendManualDigest);
router.post('/prayers/:prayerId/comments', requireAdmin, recaptchaMiddleware, addAdminComment);

// NEW: admin portal endpoints
router.get('/prayers', requireAdmin, listPrayers);
router.get('/prayers/:prayerId', requireAdmin, getPrayerDetail);
router.get('/roster', requireAuth, requireAdmin, getAdminRoster);
router.get('/prayers/:prayerId/comments', requireAdmin, getPrayerThread);
router.get('/roster', requireAuth, requireAdmin, getAdminRoster);

// NEW: update prayer status (admin only)
router.patch('/prayers/:prayerId/status', requireAdmin, recaptchaMiddleware, setPrayerStatus);
router.patch('/roster/:id', requireAuth, requireAdmin, patchAdminRosterUser);


// NEW: hard delete prayer (admin only)
router.delete('/prayers/:id', requireAdmin, recaptchaMiddleware, deletePrayer);
router.delete('/roster/:id', requireAuth, requireAdmin, deleteAdminRosterUser);

export default router;


