import { Router } from 'express';
import { requireAdmin } from '../middleware/adminGuard.middleware.js';
import { exportFilteredToGroup } from '../controllers/export.controller.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';

const router: Router = Router();

// Protect bulk export with both admin auth and reCAPTCHA Enterprise (path-mapped)
router.post('/prayers', requireAdmin, recaptchaMiddleware, exportFilteredToGroup);

export default router;
