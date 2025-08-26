import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/adminGuard.middleware.js';
import { getGroup, updateGroup } from '../controllers/group.controller.js';

const router: Router = Router();

router.get('/', requireAuth, getGroup);
router.patch('/', requireAdmin, updateGroup);

export default router;
