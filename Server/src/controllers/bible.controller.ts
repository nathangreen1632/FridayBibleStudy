import type { Request, Response } from 'express';
import {
  listBibles,
  getPassage,
  getVerseOfDay,
  getFirstChapter as svcGetFirstChapter,
  getChapterById as svcGetChapterById, listChaptersForBook, listBooksForBible,
} from '../services/bible.service.js';

export async function listBiblesController(req: Request, res: Response): Promise<void> {
  const out = await listBibles();
  if (!out.ok) {
    res.status(out.status).json({ ok: false, error: out.error ?? 'Bible list unavailable' });
    return;
  }
  res.json({ ok: true, data: out.data });
}

export async function getPassageController(req: Request, res: Response): Promise<void> {
  const reference = String(req.query.reference ?? '').trim();
  const bibleId = String(req.query.bibleId ?? '').trim();

  if (!reference) {
    res.status(400).json({ ok: false, error: 'Missing reference' });
    return;
  }

  const out = await getPassage(bibleId, reference);
  if (!out.ok) {
    res.status(out.status).json({ ok: false, error: out.error ?? 'Passage unavailable' });
    return;
  }

  res.json({ ok: true, data: out.data });
}

export async function getVerseOfDayController(req: Request, res: Response): Promise<void> {
  const bibleId = String(req.query.bibleId ?? '').trim();

  const out = await getVerseOfDay(bibleId);
  if (!out.ok) {
    res.status(out.status).json({ ok: false, error: out.error ?? 'Verse unavailable' });
    return;
  }

  res.json({ ok: true, data: out.data });
}

export async function getFirstChapterController(req: Request, res: Response): Promise<void> {
  const bibleId = String(req.query?.bibleId ?? '').trim();
  try {
    const out = await svcGetFirstChapter(bibleId);
    if (!out.ok) {
      res.status(out.status).json({ ok: false, error: out.error ?? 'First chapter unavailable' });
      return;
    }
    res.status(200).json({ ok: true, data: out.data });
  } catch {
    res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}

export async function getChapterByIdController(req: Request, res: Response): Promise<void> {
  const bibleId = String(req.query?.bibleId ?? '').trim();
  const chapterId = String(req.params?.chapterId ?? '').trim();

  if (!chapterId) {
    res.status(400).json({ ok: false, error: 'Missing chapterId' });
    return;
  }

  try {
    const out = await svcGetChapterById(bibleId, chapterId);
    if (!out.ok) {
      res.status(out.status).json({ ok: false, error: out.error ?? 'Chapter unavailable' });
      return;
    }
    res.status(200).json({ ok: true, data: out.data });
  } catch {
    res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}

export async function listBooksController(req: Request, res: Response): Promise<void> {
  const bibleId = String(req.query?.bibleId ?? '').trim();
  const out = await listBooksForBible(bibleId);
  if (!out.ok) {
    res.status(out.status).json({ ok: false, error: out.error ?? 'Books unavailable' });
    return;
  }
  res.json({ ok: true, data: out.data });
}

export async function listChaptersController(req: Request, res: Response): Promise<void> {
  const bibleId = String(req.query?.bibleId ?? '').trim();
  const bookId = String(req.query?.bookId ?? '').trim();
  const out = await listChaptersForBook(bibleId, bookId);
  if (!out.ok) {
    res.status(out.status).json({ ok: false, error: out.error ?? 'Chapters unavailable' });
    return;
  }
  res.json({ ok: true, data: out.data });
}