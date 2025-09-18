import type { Router } from 'express';
import { Router as makeRouter } from 'express';
import photosRouter from '../controllers/photos.controller.js';

const router: Router = makeRouter();

router.use('/', photosRouter);

export default router;
