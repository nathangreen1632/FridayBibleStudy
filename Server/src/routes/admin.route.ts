import { Router } from 'express';
import { requireAdmin } from '../middleware/adminGuard.middleware.js';
import { promoteUser } from '../controllers/admin.controller.js';

const router: Router = Router();
router.post('/promote', requireAdmin, promoteUser);
export default router;
