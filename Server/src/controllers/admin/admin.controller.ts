// Server/src/controllers/admin.controller.ts
import type { Request, Response } from 'express';
import { User } from '../../models/index.js';
import { findPrayersForAdmin, getPrayerComments, insertAdminComment, updatePrayerStatus, findPrayerByIdForAdmin } from '../../services/admin/admin.service.js';
import type { Status } from '../../models/prayer.model.js';

export async function promoteUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.body as { userId: number };
  const u = await User.findByPk(userId);
  if (!u) { res.status(404).json({ error: 'User not found' }); return; }
  u.role = 'admin';
  await u.save();
  res.json({ ok: true });
}

export async function listPrayers(req: Request, res: Response): Promise<void> {
  try {
    const { q, groupId, status, category, page, pageSize } = req.query;
    const result = await findPrayersForAdmin({
      q: typeof q === 'string' ? q : undefined,
      groupId: groupId ? Number(groupId) : undefined,
      status: typeof status === 'string' ? (status as Status) : undefined,
      category: typeof category === 'string' ? (category as any) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Could not load prayers.' });
  }
}

export async function getPrayerThread(req: Request, res: Response): Promise<void> {
  const { prayerId } = req.params;
  try {
    const roots = await getPrayerComments(Number(prayerId));
    res.json({ items: roots });
  } catch {
    res.status(500).json({ error: 'Could not load comments.' });
  }
}

export async function addAdminComment(req: Request, res: Response): Promise<void> {
  const { prayerId } = req.params;
  const { content } = req.body as { content: string };
  const adminId = req.user?.id ?? 0;

  if (!content?.trim()) { res.status(400).json({ error: 'Content required.' }); return; }

  try {
    const c = await insertAdminComment(Number(prayerId), adminId, content.trim());
    res.json({ ok: true, comment: c });
  } catch {
    res.status(500).json({ error: 'Could not add comment.' });
  }
}

export async function setPrayerStatus(req: Request, res: Response): Promise<void> {
  const { prayerId } = req.params;
  const { status } = req.body as { status: Status };
  if (!status) { res.status(400).json({ error: 'Status required.' }); return; }

  const result = await updatePrayerStatus(Number(prayerId), status);
  if (!('ok' in result) || !result.ok) {
    res.status(404).json({ error: 'Prayer not found.' }); return;
  }
  res.json({ ok: true });
}

export async function demoteUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.body as { userId?: number };
  if (!userId) { res.status(400).json({ error: 'userId required' }); return; }

  try {
    const u = await User.findByPk(userId);
    if (!u) { res.status(404).json({ error: 'User not found' }); return; }
    if (u.role !== 'admin') { res.status(200).json({ ok: true }); return; } // already not admin

    u.role = 'classic';
    await u.save();

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not demote user' });
  }
}

export async function getPrayerDetail(req: Request, res: Response): Promise<void> {
  const rawId = req.params?.prayerId;
  const prayerId = Number(rawId);

  if (!rawId || Number.isNaN(prayerId) || prayerId <= 0) {
    res.status(400).json({ error: 'Invalid prayerId' });
    return;
  }

  try {
    const prayer = await findPrayerByIdForAdmin(prayerId);
    if (!prayer) {
      res.status(404).json({ error: 'Prayer not found' });
      return;
    }
    // Returning { prayer } matches your client-side normalizer paths.
    res.json({ prayer });
  } catch {
    res.status(500).json({ error: 'Failed to load prayer detail' });
  }
}