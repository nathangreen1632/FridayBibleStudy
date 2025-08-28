import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/adminGuard.middleware.js';
import { getGroup, updateGroup } from '../controllers/group.controller.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';

const router: Router = Router();

// View group info (auth required)
router.get('/', requireAuth, getGroup);

// Update group info (admin + path-mapped reCAPTCHA)
router.patch('/', requireAdmin, recaptchaMiddleware, updateGroup);

export default router;
