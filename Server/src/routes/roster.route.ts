import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getRoster } from '../controllers/roster.controller.js';

const router: Router = Router();

/** GET /api/roster?{q,page,pageSize,sortBy,sortDir} — read-only */
router.get('/', requireAuth, getRoster);

export default router;
