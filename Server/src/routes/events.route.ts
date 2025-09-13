// Server/src/routes/events.route.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getGroupEvents } from '../controllers/events.controller.js';

const router: Router = Router();

router.get('/', requireAuth, getGroupEvents);

export default router;
