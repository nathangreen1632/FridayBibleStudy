// Server/src/routes/bible.route.ts
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

// List available Bible versions for the configured provider/key
router.get('/bibles', requireAuth, listBiblesController);

// Passage by reference (e.g., "JHN.3.16" or "PSA.23") with optional ?bibleId=
router.get('/passage', requireAuth, getPassageController);

// Verse of the day (server-determined) with optional ?bibleId=
router.get('/verse-of-day', getVerseOfDayController);

// Chapter navigation (content + neighbors)
router.get('/first-chapter', getFirstChapterController);
router.get('/chapter/:chapterId', getChapterByIdController);

// NEW: Books and chapters metadata for dropdowns
router.get('/books', listBooksController);
router.get('/chapters', listChaptersController);

export default router;
