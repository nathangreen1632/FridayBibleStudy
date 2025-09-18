import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  listBiblesController,
  getPassageController,
  getVerseOfDayController,
  getChapterByIdController,
  getFirstChapterController,
  listBooksController,
  listChaptersController,
} from '../controllers/bible.controller.js';

const router: Router = Router();

router.get('/bibles', requireAuth, listBiblesController);

router.get('/passage', requireAuth, getPassageController);

router.get('/verse-of-day', getVerseOfDayController);

router.get('/first-chapter', getFirstChapterController);
router.get('/chapter/:chapterId', getChapterByIdController);

router.get('/books', listBooksController);
router.get('/chapters', listChaptersController);

export default router;
