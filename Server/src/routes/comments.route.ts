import type { Router } from 'express';
import { Router as makeRouter } from 'express';
import commentsRouter from '../controllers/comments.controller.js';

const router: Router = makeRouter();

// All paths in the controller are relative to /comments
router.use('/', commentsRouter);

export default router;
