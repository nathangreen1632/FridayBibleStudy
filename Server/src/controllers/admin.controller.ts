import type { Request, Response } from 'express';
import { User } from '../models/index.js';

export async function promoteUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.body as { userId: number };
  const u = await User.findByPk(userId);
  if (!u) { res.status(404).json({ error: 'User not found' }); return; }
  u.role = 'admin';
  await u.save();
  res.json({ ok: true });
}
