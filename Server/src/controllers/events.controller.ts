// Server/src/controllers/events.controller.ts
import type { Request, Response } from 'express';
import { listEvents } from '../services/events.service.js';

export async function getGroupEvents(req: Request, res: Response): Promise<void> {
  try {
    const gid = typeof req.user?.groupId === 'number' && req.user.groupId > 0 ? req.user.groupId : 1;
    const items = await listEvents(gid);
    res.json({ data: items });
  } catch {
    res.status(500).json({ error: 'Failed to load events.' });
  }
}
