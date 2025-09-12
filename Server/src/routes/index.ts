import { Router } from 'express';
import authRouter from './auth.route.js';
import prayersRouter from './prayers.route.js';
import groupsRouter from './groups.route.js';
import adminRouter from './admin/admin.route.js';
import exportRouter from './export.route.js';
import contactRouter from './contact.route.js';
import commentsRouter from './comments.route.js';
import healthRouter from './health.route.js';
import photosRouter from './photos.route.js';
import bibleRouter from './bible.route.js';
import eventsRouter from './events.route.js';
import adminEventsRouter from './admin/events.admin.route.js';

const router: Router = Router();

router.use('/admin',    adminRouter);
router.use('/admin/events', adminEventsRouter);
router.use('/auth',     authRouter);
router.use('/bible', bibleRouter);
router.use('/contact',  contactRouter);
router.use('/events', eventsRouter);
router.use('/export',   exportRouter);
router.use('/groups',   groupsRouter);
router.use('/prayers',  prayersRouter);
router.use('/comments', commentsRouter);
router.use('/health',   healthRouter);
router.use('/photos',   photosRouter);


export default router;
