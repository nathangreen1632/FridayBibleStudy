import type { Request, Response } from 'express';
import { listEvents } from '../services/events.service.js';
import { Event } from '../models/index.js';

function toStr(v: unknown): string | null {
  if (typeof v === 'string') return v.trim();
  return null;
}

function toIsoOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function getGroupEvents(req: Request, res: Response): Promise<void> {
  try {
    const gid = typeof req.user?.groupId === 'number' && req.user.groupId > 0 ? req.user.groupId : 1;
    const items = await listEvents(gid);
    res.json({ data: items });
  } catch {
    res.status(500).json({ error: 'Failed to load events.' });
  }
}

export async function patchAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params?.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid event id' });
      return;
    }

    const ev = await Event.findByPk(id);
    if (!ev) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const title = toStr(req.body?.title);
    const content = toStr(req.body?.content);
    const location = toStr(req.body?.location);
    const startsAt = toIsoOrNull(req.body?.startsAt);
    const endsAt = toIsoOrNull(req.body?.endsAt);

    const patch: Record<string, unknown> = {};
    if (title !== null) patch.title = title;
    if (content !== null) patch.content = content;
    if (location !== null) patch.location = location;
    if (startsAt !== null) patch.startsAt = startsAt;
    if (endsAt !== null) patch.endsAt = endsAt;

    await ev.update(patch);
    res.json({ ok: true, data: ev });
  } catch {
    res.status(500).json({ error: 'Unable to update event' });
  }
}

export async function deleteAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params?.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid event id' });
      return;
    }

    const ev = await Event.findByPk(id);
    if (!ev) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    await ev.destroy();
    res.json({ ok: true, deletedId: id });
  } catch {
    res.status(500).json({ error: 'Unable to delete event' });
  }
}