import { Router } from 'express';
import { requireAdmin } from '../middleware/adminGuard.middleware.js';
import { promoteUser } from '../controllers/admin.controller.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';

const router: Router = Router();

// Admin-only action: require admin first, then reCAPTCHA (path-mapped)
router.post('/promote', requireAdmin, recaptchaMiddleware, promoteUser);

export default router;
