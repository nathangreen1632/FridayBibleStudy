// Server/src/controllers/admin/digest.controller.ts
import type { Request, Response } from 'express';
import { collectUpdatesLastNDays, sendDigest } from '../../services/admin/digest.service.js';

const DEFAULT_DAYS = 7;
const MANUAL_LOOKBACK_DAYS = 30;

/** Safe number parse with an optional minimum bound. */
function num(val: unknown, fallback: number, min?: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  if (typeof min === 'number' && n < min) return fallback;
  return n;
}

/** Safe string parse that trims and returns undefined if empty. */
function str(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const s = val.trim();
  return s.length ? s : undefined;
}

/** Preview: last N days of updates (prayerUpdates + root comments) for a group */
export async function previewDigest(req: Request, res: Response): Promise<void> {
  const groupId = num(req.body?.groupId, 0, 1);
  const days = num(req.body?.days, DEFAULT_DAYS, 1);

  if (!groupId) {
    res.status(400).json({ ok: false, error: 'groupId required' });
    return;
  }

  const updates = await collectUpdatesLastNDays(groupId, days);
  res.status(200).json({ ok: true, updates });
}

/** One-click: auto-collect (last N days) and send to group members */
export async function sendAutoDigest(req: Request, res: Response): Promise<void> {
  const groupId = num(req.body?.groupId, 0, 1);
  const createdById = num((req as any).user?.id, 0, 0);
  const days = num(req.body?.days, DEFAULT_DAYS, 1);
  const subject = str(req.body?.subject);
  const threadMessageId = str(req.body?.threadMessageId) ?? null;

  if (!groupId) {
    res.status(400).json({ ok: false, error: 'groupId required' });
    return;
  }

  const updates = await collectUpdatesLastNDays(groupId, days);
  const result = await sendDigest({
    groupId,
    createdById,
    updates,
    subject,
    replyTo: undefined,       // placeholder; your email.service currently ignores this
    threadMessageId,
  });

  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.error ?? 'Send failed' });
    return;
  }

  res.status(200).json({ ok: true, messageId: result.messageId });
}

/** Manual: admin picks specific update IDs (filters from last 30 days for safety) */
export async function sendManualDigest(req: Request, res: Response): Promise<void> {
  const groupId = num(req.body?.groupId, 0, 1);
  const createdById = num((req as any).user?.id, 0, 0);
  const subject = str(req.body?.subject);
  const threadMessageId = str(req.body?.threadMessageId) ?? null;

  const ids: number[] = Array.isArray(req.body?.updateIds)
    ? (req.body.updateIds as unknown[]).map(v => num(v, NaN)).filter(n => Number.isFinite(n))
    : [];

  if (!groupId) {
    res.status(400).json({ ok: false, error: 'groupId required' });
    return;
  }

  // Collect a generous window, then filter to the IDs the admin picked.
  const all = await collectUpdatesLastNDays(groupId, MANUAL_LOOKBACK_DAYS);
  const wanted = new Set(ids);
  const chosen = ids.length ? all.filter(u => wanted.has(u.id)) : [];

  const result = await sendDigest({
    groupId,
    createdById,
    updates: chosen,
    subject,
    replyTo: undefined,       // placeholder; see note above
    threadMessageId,
  });

  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.error ?? 'Send failed' });
    return;
  }

  res.status(200).json({ ok: true, messageId: result.messageId });
}
