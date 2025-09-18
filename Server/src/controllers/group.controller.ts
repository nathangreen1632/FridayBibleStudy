import type { Request, Response } from 'express';
import { Group } from '../models/index.js';
import { env } from '../config/env.config.js';

export async function getGroup(_req: Request, res: Response): Promise<void> {
  let g = await Group.findOne();
  if (!g) {
    g = await Group.create({
      name: 'Friday Bible Study',
      slug: 'friday-bible-study',
      groupEmail: env.GROUP_EMAIL,
    });
    console.log('[db] seeded Group:', g.slug);
  }
  res.json(g);
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  const { groupEmail } = req.body as { groupEmail: string };
  const g = await Group.findOne();
  if (!g) { res.status(404).json({ error: 'Group not found' }); return; }
  g.groupEmail = groupEmail;
  await g.save();
  res.json(g);
}
