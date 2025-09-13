// Server/src/controllers/admin/events.admin.controller.ts
import type { Request, Response } from 'express';
import {
  createEvent,
  updateEvent,
  deleteEventById,
  listEventsAdmin,
} from '../../services/events.service.js';

function toStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t;
}

function toDateOrNull(v: unknown): Date | null {
  try {
    if (v == null) return null;
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export async function adminCreateEvent(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const payload = {
    groupId: typeof req.body?.groupId === 'number' && req.body.groupId > 0 ? req.body.groupId : (user.groupId ?? 1),
    authorUserId: user.id,
    title: toStringOrNull(req.body?.title) ?? '',
    content: toStringOrNull(req.body?.content) ?? '',
    location: toStringOrNull(req.body?.location),
    startsAt: toDateOrNull(req.body?.startsAt),
    endsAt: toDateOrNull(req.body?.endsAt),
    status: ((): 'draft' | 'published' => {
      const s = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
      if (s === 'draft' || s === 'published') return s as 'draft' | 'published';
      return 'published';
    })(),
  };

  if (!payload.title || !payload.content) {
    res.status(400).json({ error: 'Missing title or content.' });
    return;
  }

  try {
    const out = await createEvent(payload as any);
    if (!out.ok || !out.id) {
      res.status(500).json({ error: 'Failed to create event.' });
      return;
    }
    res.json({ ok: true, id: out.id });
  } catch {
    res.status(500).json({ error: 'Failed to create event.' });
  }
}

export async function adminUpdateEvent(req: Request, res: Response): Promise<void> {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: 'Invalid event id.' }); return; }

  const updates: Record<string, unknown> = {};
  const title = toStringOrNull(req.body?.title);
  const content = toStringOrNull(req.body?.content);
  const location = toStringOrNull(req.body?.location);
  const startsAt = toDateOrNull(req.body?.startsAt);
  const endsAt = toDateOrNull(req.body?.endsAt);
  const statusRaw = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : null;

  if (title !== null) updates.title = title;
  if (content !== null) updates.content = content;
  if (location !== null) updates.location = location;
  if (startsAt !== null || req.body?.startsAt === null) updates.startsAt = startsAt;
  if (endsAt !== null || req.body?.endsAt === null) updates.endsAt = endsAt;
  if (statusRaw === 'draft' || statusRaw === 'published') updates.status = statusRaw;

  try {
    const ok = await updateEvent(id, updates);
    if (!ok) { res.status(404).json({ error: 'Event not found or not updated.' }); return; }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to update event.' });
  }
}

export async function adminDeleteEvent(req: Request, res: Response): Promise<void> {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: 'Invalid event id.' }); return; }

  try {
    const ok = await deleteEventById(id);
    if (!ok) { res.status(404).json({ error: 'Event not found.' }); return; }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete event.' });
  }
}

export async function adminListEvents(req: Request, res: Response): Promise<void> {
  try {
    const gid = typeof req.query?.groupId === 'string' ? Number(req.query.groupId) : req.user?.groupId ?? 1;
    const includeDrafts = String(req.query?.includeDrafts ?? '').toLowerCase() === 'true';
    const items = await listEventsAdmin({ groupId: gid, includeDrafts });
    res.json({ items });
  } catch {
    res.status(500).json({ error: 'Failed to load events.' });
  }
}
