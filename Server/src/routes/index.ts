import { Router } from 'express';
import authRouter from './auth.route.js';
import prayersRouter from './prayers.route.js';
import groupsRouter from './groups.route.js';
import adminRouter from './admin.route.js';
import exportRouter from './export.route.js';
import contactRouter from './contact.route.js';
import commentsRouter from './comments.route.js';

const router: Router = Router();

router.use('/admin',   adminRouter);
router.use('/auth',   authRouter);
router.use('/contact', contactRouter);
router.use('/export',  exportRouter);
router.use('/groups',  groupsRouter);
router.use('/prayers', prayersRouter);
router.use('/comments', commentsRouter);

export default router;
