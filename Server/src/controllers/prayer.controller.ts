// Server/src/controllers/prayer.controller.ts
import type { Request, Response } from 'express';
import type { Order, WhereOptions } from 'sequelize';

import path from 'path';

import { sequelize } from '../config/sequelize.config.js';
import { env } from '../config/env.config.js';
import { emitToGroup } from '../config/socket.config.js';

import { Group, PrayerUpdate, User, Attachment, PrayerParticipant } from '../models/index.js';
import { Prayer, type Status } from '../models/prayer.model.js';

import { Events } from '../types/socket.types.js';
import { toPrayerDTO } from './dto/prayer.dto.js';

import {
  notifyGroupOnCategoryCreate,
  notifyAdminOnCategoryCreate,
  sendEmailViaResend,
} from '../services/resend.service.js';

// DRY helper to load a prayer (optionally with author) or return 404
async function findPrayerOr404(
  id: number,
  res: Response,
  includeAuthor = false
): Promise<Prayer | undefined> {
  const include = includeAuthor ? [{ model: User, as: 'author', attributes: ['id', 'name'] }] : undefined;
  const p = await Prayer.findByPk(id, { include });
  if (!p) {
    res.status(404).json({ error: 'Not found' });
    return undefined;
  }
  return p;
}

/** ------------------------------------------------------------------------
 * Keep column positions dense so manual sorting remains meaningful.
 * Re-pack positions to 0..N-1 and emit per-item updates so clients reconcile.
 * Non-fatal: any failure is swallowed.
 * -----------------------------------------------------------------------*/
async function normalizePositions(groupId: number, status: Status): Promise<void> {
  try {
    const rows = await Prayer.findAll({
      where: { groupId, status },
      order: [['position', 'asc'], ['id', 'asc']],
      attributes: ['id', 'position', 'groupId', 'status'],
    });

    let needs = false;
    for (let i = 0; i < rows.length; i++) {
      const expected = i;
      const actual = Number(rows[i].position ?? 0);
      if (actual !== expected) {
        needs = true;
        break;
      }
    }
    if (!needs) return;

    for (let i = 0; i < rows.length; i++) {
      try {
        await Prayer.update({ position: i }, { where: { id: rows[i].id } });
      } catch {
        // best-effort
      }

      try {
        const p = await Prayer.findByPk(rows[i].id, {
          include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
        });
        if (p) {
          const payload = { prayer: toPrayerDTO(p) };
          emitToGroup(p.groupId, 'prayer:updated', payload);
          emitToGroup(p.groupId, Events.PrayerUpdated, payload);
        }
      } catch {
        // best-effort
      }
    }
  } catch {
    // non-fatal
  }
}

export async function listPrayers(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const q = (req.query.q as string) ?? '';
  const status = req.query.status as Status | undefined;
  const category = req.query.category as string | undefined;
  const sort = (req.query.sort as 'name' | 'date' | 'prayer' | 'status') ?? 'date';
  const dir = (req.query.dir as 'asc' | 'desc') ?? 'desc';

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const include = [{ model: User, as: 'author', attributes: ['id', 'name'] }];

  let order: Order;
  if (sort === 'name') {
    order = [[{ model: User, as: 'author' }, 'name', dir]];
  } else if (sort === 'prayer') {
    order = [['title', dir]];
  } else if (sort === 'status') {
    order = [['status', 'asc'], ['position', 'asc']];
  } else {
    order = [['createdAt', dir]];
  }

  const { rows, count } = await Prayer.findAndCountAll({
    where,
    include,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const rowsWithAuthor = rows as Array<Prayer & { author?: { id: number; name: string } }>;

  const filtered = q
    ? rowsWithAuthor.filter(
      (p) =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.content.toLowerCase().includes(q.toLowerCase()) ||
        (p.author?.name.toLowerCase().includes(q.toLowerCase()) ?? false)
    )
    : rowsWithAuthor;

  res.json({ items: filtered, total: count });
}

/** ------------------------------------------------------------------------
 * listMyPrayers — only prayers created by the authenticated user
 * Mirrors listPrayers query params & ordering; returns DTOs.
 * -----------------------------------------------------------------------*/
export async function listMyPrayers(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 50);
  const q = (req.query.q as string) ?? '';
  const status = req.query.status as Status | undefined;
  const category = req.query.category as string | undefined;
  const sort = (req.query.sort as 'name' | 'date' | 'prayer' | 'status') ?? 'date';
  const dir = (req.query.dir as 'asc' | 'desc') ?? 'desc';

  const where: WhereOptions = { authorUserId: req.user!.userId };
  if (status) (where as Record<string, unknown>).status = status;
  if (category) (where as Record<string, unknown>).category = category;

  const include = [{ model: User, as: 'author', attributes: ['id', 'name'] }];

  let order: Order = [['updatedAt', dir]];
  if (sort === 'name') order = [[{ model: User, as: 'author' }, 'name', dir]];
  if (sort === 'prayer') order = [['title', dir]];
  if (sort === 'status') order = [['status', dir]];

  try {
    const { rows, count } = await Prayer.findAndCountAll({
      where,
      include,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order,
    });

    const items = rows.map((p) => toPrayerDTO(p));
    const filtered = q
      ? items.filter(
        (p) =>
          p.title.toLowerCase().includes(q.toLowerCase()) ||
          p.content.toLowerCase().includes(q.toLowerCase()) ||
          (p.author?.name?.toLowerCase().includes(q.toLowerCase()) ?? false)
      )
      : items;

    res.json({ items: filtered, total: count });
  } catch {
    res.status(500).json({ error: 'Failed to load your prayers' });
  }
}

export async function getPrayer(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const prayer = await findPrayerOr404(id, res, true);
  if (!prayer) return;
  res.json(prayer);
}

export async function createPrayer(req: Request, res: Response): Promise<void> {
  const { title, content, category, actAsUserId } = req.body as {
    title: string;
    content: string;
    category: Prayer['category'];
    actAsUserId?: number;
  };

  const authorUserId = req.user!.role === 'admin' && actAsUserId ? actAsUserId : req.user!.userId;

  // single-group v1; ensure a Group exists during boot/seed
  const group = await Group.findOne();
  const groupId = group?.id ?? 1;

  const created = await Prayer.create({ title, content, category, groupId, authorUserId, status: 'active' });

  // emit full DTO (typed + legacy)
  emitToGroup(groupId, Events.PrayerCreated, { prayer: toPrayerDTO(created) });

  // Put new prayers at the top immediately, then normalize
  try {
    const minPosRaw = await Prayer.min('position', { where: { groupId, status: 'active' } });
    let nextPos = -1;
    if (typeof minPosRaw === 'number' && Number.isFinite(minPosRaw)) {
      nextPos = minPosRaw - 1;
    }
    await Prayer.update({ position: nextPos }, { where: { id: created.id } });

    try {
      const reloaded = await Prayer.findByPk(created.id, {
        include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
      });
      if (reloaded) {
        const payload = { prayer: toPrayerDTO(reloaded) };
        emitToGroup(groupId, 'prayer:updated', payload);
        emitToGroup(groupId, Events.PrayerUpdated, payload);
      }
    } catch {
      // best-effort
    }

    await normalizePositions(groupId, 'active');
  } catch {
    // non-fatal
  }

  // Non-fatal email notifications
  const linkUrl = `${env.PUBLIC_URL}/portal/prayers/${created.id}`;
  try {
    await notifyGroupOnCategoryCreate({
      category: created.category,
      title: created.title,
      description: created.content,
      createdByName: undefined,
      linkUrl,
    });
  } catch {}
  try {
    await notifyAdminOnCategoryCreate({
      category: created.category,
      title: created.title,
      description: created.content,
      createdByName: undefined,
      linkUrl,
    });
  } catch {}

  res.json(created);
}

export async function updatePrayer(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const { title, content, category, status, position } = req.body as Partial<
    Pick<Prayer, 'title' | 'content' | 'category' | 'status' | 'position'>
  >;

  const prayer = await findPrayerOr404(id, res);
  if (!prayer) return;

  const isAuthor = prayer.authorUserId === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';

  const isOnlyMove =
    title === undefined &&
    content === undefined &&
    category === undefined &&
    (status !== undefined || position !== undefined);

  let isParticipant = false;
  if (!isAuthor && !isAdmin && isOnlyMove) {
    const pp = await PrayerParticipant.findOne({
      where: { prayerId: prayer.id, userId: req.user!.userId },
    });
    isParticipant = !!pp;
  }

  if (!isAuthor && !isAdmin && !isParticipant) {
    res.status(403).json({ error: 'You may not move another\'s prayer' });
    return;
  }

  const prevStatus = prayer.status;

  if (title !== undefined) prayer.title = title;
  if (content !== undefined) prayer.content = content;
  if (category !== undefined) prayer.category = category as any;
  if (status !== undefined) prayer.status = status as any;
  if (position !== undefined) prayer.position = position;

  await prayer.save();

  if (prevStatus !== prayer.status) {
    emitToGroup(prayer.groupId, Events.PrayerMoved, {
      prayer: toPrayerDTO(prayer),
      from: prevStatus as 'active' | 'praise' | 'archived',
      to: prayer.status as 'active' | 'praise' | 'archived',
    });
  } else {
    const payload = { prayer: toPrayerDTO(prayer) };
    emitToGroup(prayer.groupId, 'prayer:updated', payload);
    emitToGroup(prayer.groupId, Events.PrayerUpdated, payload);
  }

  res.json(prayer);
}

export async function deletePrayer(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const prayer = await findPrayerOr404(id, res);
  if (!prayer) return;

  const isAuthor = prayer.authorUserId === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';
  if (!isAuthor && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const groupId = prayer.groupId;
  const statusBeforeDelete = prayer.status;

  try {
    await sequelize.transaction(async (t) => {
      await PrayerParticipant.destroy({ where: { prayerId: prayer.id }, transaction: t });
      await PrayerUpdate.destroy({ where: { prayerId: prayer.id }, transaction: t });
      await Attachment.destroy({ where: { prayerId: prayer.id }, transaction: t });
      await prayer.destroy({ transaction: t });
    });
  } catch {
    res.status(500).json({ error: 'Unable to delete this prayer right now.' });
    return;
  }

  try {
    emitToGroup(groupId, 'prayer:deleted', { id });
  } catch {
    // non-fatal
  }

  try {
    await normalizePositions(groupId, statusBeforeDelete);
  } catch {}

  res.json({ ok: true });
}

export async function createUpdate(req: Request, res: Response): Promise<void> {
  const prayerId = Number(req.params.id);
  const { content } = req.body as { content: string };

  const prayer = await findPrayerOr404(prayerId, res);
  if (!prayer) return;

  const upd = await PrayerUpdate.create({ prayerId, authorUserId: req.user!.userId, content });

  try {
    const minPosRaw = await Prayer.min('position', {
      where: { groupId: prayer.groupId, status: prayer.status },
    });

    let nextPos = -1;
    if (typeof minPosRaw === 'number' && Number.isFinite(minPosRaw)) {
      nextPos = minPosRaw - 1;
    }

    prayer.position = nextPos;
    await prayer.save();

    const payload = { prayer: toPrayerDTO(prayer) };
    try {
      emitToGroup(prayer.groupId, 'prayer:updated', payload);
    } catch {}
    try {
      emitToGroup(prayer.groupId, Events.PrayerUpdated, payload);
    } catch {}

    await normalizePositions(prayer.groupId, prayer.status);
  } catch {
    // update still succeeds even if bump/normalize fails
  }

  try {
    emitToGroup(prayer.groupId, 'update:created', { id: upd.id, prayerId });
  } catch {}

  try {
    const group = await Group.findByPk(prayer.groupId);
    await sendEmailViaResend({
      to: group?.groupEmail ?? env.GROUP_EMAIL,
      subject: 'Prayer Updated',
      html: `<p>Prayer <b>${prayer.title}</b> was updated.</p><p>${content}</p>`,
    });
  } catch {}

  res.json(upd);
}

export async function addAttachments(req: Request, res: Response): Promise<void> {
  const prayerId = Number(req.params.id);
  const files = (req.files ?? []) as Express.Multer.File[];
  if (!Number.isFinite(prayerId)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const saved = await Promise.all(
    files.map((f) =>
      Attachment.create({
        prayerId,
        filePath: path.join(env.UPLOAD_DIR, path.basename(f.path)),
        fileName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      })
    )
  );
  res.json({ items: saved });
}
