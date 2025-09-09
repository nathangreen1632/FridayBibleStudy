import type { Request, Response } from 'express';
import { collectUpdatesLastNDays, sendDigest } from '../../services/admin/digest.service.js';

/** Preview: last N days of root updates for a group */
export async function previewDigest(req: Request, res: Response): Promise<void> {
  const groupId = Number(req.body?.groupId);
  const days = typeof req.body?.days === 'number' && req.body.days > 0 ? req.body.days : 7;

  if (!groupId) { res.status(400).json({ ok: false, error: 'groupId required' }); return; }

  const updates = await collectUpdatesLastNDays(groupId, days);
  res.json({ ok: true, updates });
}

/** One-click: auto-collect and send */
export async function sendAutoDigest(req: Request, res: Response): Promise<void> {
  const groupId = Number(req.body?.groupId);
  const createdById = req.user?.id ?? 0;
  const days = typeof req.body?.days === 'number' && req.body.days > 0 ? req.body.days : 7;
  const subject = typeof req.body?.subject === 'string' ? req.body.subject : undefined;
  const threadMessageId = typeof req.body?.threadMessageId === 'string' ? req.body.threadMessageId : null;

  if (!groupId) { res.status(400).json({ ok: false, error: 'groupId required' }); return; }

  const updates = await collectUpdatesLastNDays(groupId, days);
  const result = await sendDigest({
    groupId,
    createdById,
    updates,
    subject,
    replyTo: undefined, // will auto-pick groups.groupEmail
    threadMessageId,
  });

  if (!result.ok) { res.status(500).json({ ok: false, error: result.error ?? 'Send failed' }); return; }
  res.json({ ok: true, messageId: result.messageId });
}

/** Manual: admin picks specific update IDs (filter over last 30 days for safety) */
export async function sendManualDigest(req: Request, res: Response): Promise<void> {
  const groupId = Number(req.body?.groupId);
  const createdById = req.user?.id ?? 0;
  const ids = Array.isArray(req.body?.updateIds) ? (req.body.updateIds as number[]) : [];
  const subject = typeof req.body?.subject === 'string' ? req.body.subject : undefined;
  const threadMessageId = typeof req.body?.threadMessageId === 'string' ? req.body.threadMessageId : null;

  if (!groupId) { res.status(400).json({ ok: false, error: 'groupId required' }); return; }

  const all = await collectUpdatesLastNDays(groupId, 30);
  const chosen = ids.length ? all.filter((u) => ids.includes(u.id)) : [];

  const result = await sendDigest({
    groupId,
    createdById,
    updates: chosen,
    subject,
    replyTo: undefined,
    threadMessageId,
  });

  if (!result.ok) { res.status(500).json({ ok: false, error: result.error ?? 'Send failed' }); return; }
  res.json({ ok: true, messageId: result.messageId });
}
