import { Router } from 'express';
import { requireAdmin } from '../middleware/adminGuard.middleware.js';
import { exportFilteredToGroup } from '../controllers/export.controller.js';

const router: Router = Router();
router.post('/prayers', requireAdmin, exportFilteredToGroup);
export default router;
