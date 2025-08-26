import { Router } from 'express';
import authRouter from './auth.route.js';
import prayersRouter from './prayers.route.js';
import groupsRouter from './groups.route.js';
import adminRouter from './admin.route.js';
import exportRouter from './export.route.js';

const router: Router = Router();

router.use('/auth',   authRouter);
router.use('/prayers', prayersRouter);
router.use('/groups',  groupsRouter);
router.use('/admin',   adminRouter);
router.use('/export',  exportRouter);

export default router;
