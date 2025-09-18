import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getRoster } from '../controllers/roster.controller.js';

const router: Router = Router();

router.get('/', requireAuth, getRoster);

export default router;
