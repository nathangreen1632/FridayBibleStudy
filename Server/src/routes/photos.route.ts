import type { Router } from 'express';
import { Router as makeRouter } from 'express';
import photosRouter from '../controllers/photos.controller.js';

const router: Router = makeRouter();

// All paths in the controller are relative to /photos
router.use('/', photosRouter);

export default router;
