import type { Request, Response } from 'express';
import { Group } from '../models/index.js';

export async function getGroup(_req: Request, res: Response): Promise<void> {
  let g = await Group.findOne();
  if (!g) {
    g = await Group.create({
      name: 'Friday Night Bible Study',
      slug: 'friday-night-bible-study',
      groupEmail: '**CHANGE_ME_GROUP_EMAIL@EXAMPLE.COM**'
    });
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
