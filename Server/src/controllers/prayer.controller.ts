// Server/src/controllers/prayer.controller.ts
import type { Request, Response } from 'express';
import type { Order } from 'sequelize';
import { Group, PrayerUpdate, User, Attachment, PrayerParticipant } from '../models/index.js';
import { Prayer, type Status } from '../models/prayer.model.js';
import { emitToGroup } from '../config/socket.config.js';
import path from 'path';
import { env } from '../config/env.config.js';

// NEW: typed events + DTO mapper
import { Events } from '../types/socket.types.js';
import { toPrayerDTO } from './dto/prayer.dto.js';

// NEW: Resend helpers (logic-only service)
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

  // Build a Sequelize Order without using `any`
  let order: Order;
  if (sort === 'name') {
    order = [[{ model: User, as: 'author' }, 'name', dir]];
  } else if (sort === 'prayer') {
    order = [['title', dir]];
  } else if (sort === 'status') {
    // status column ordering then position in the column
    order = [['status', 'asc'], ['position', 'asc']];
  } else {
    // date
    order = [['createdAt', dir]];
  }

  const { rows, count } = await Prayer.findAndCountAll({
    where,
    include,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize
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

  // ⬇️ emit full DTO (typed event)
  emitToGroup(groupId, Events.PrayerCreated, { prayer: toPrayerDTO(created) });

  // Notify group & admin (non-fatal)
  const linkUrl = `${env.PUBLIC_URL}/portal/prayers/${created.id}`;
  try {
    await notifyGroupOnCategoryCreate({
      category: created.category,
      title: created.title,
      description: created.content,
      createdByName: undefined, // keep neutral; can be wired to author name later
      linkUrl,
    });
  } catch { /* ignore non-fatal email errors */ }

  try {
    await notifyAdminOnCategoryCreate({
      category: created.category,
      title: created.title,
      description: created.content,
      createdByName: undefined,
      linkUrl,
    });
  } catch { /* ignore non-fatal email errors */ }

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

  // Determine if this request is *only* a move (status/position) and not an edit to content/meta
  const isOnlyMove =
    title === undefined &&
    content === undefined &&
    category === undefined &&
    (status !== undefined || position !== undefined);

  // Participants may move (archive/reorder), but not edit text/category
  let isParticipant = false;
  if (!isAuthor && !isAdmin && isOnlyMove) {
    const pp = await PrayerParticipant.findOne({
      where: { prayerId: prayer.id, userId: req.user!.userId }
    });
    isParticipant = !!pp;
  }

  if (!isAuthor && !isAdmin && !isParticipant) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // capture previous status to decide moved vs updated
  const prevStatus = prayer.status;

  // Apply changes
  if (title !== undefined) prayer.title = title;
  if (content !== undefined) prayer.content = content;
  if (category !== undefined) prayer.category = category as any;
  if (status !== undefined) prayer.status = status as any;
  if (position !== undefined) prayer.position = position;

  await prayer.save();

  // ⬇️ choose event by whether status changed
  if (prevStatus !== prayer.status) {
    emitToGroup(prayer.groupId, Events.PrayerMoved, {
      prayer: toPrayerDTO(prayer),
      from: prevStatus as 'active' | 'praise' | 'archived',
      to: prayer.status as 'active' | 'praise' | 'archived'
    });
  } else {
    // Broadcast using legacy string AND typed enum (client back-compat)
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

  await prayer.destroy();
  // keep existing event name to avoid client breakage
  emitToGroup(prayer.groupId, 'prayer:deleted', { id: prayer.id });
  res.json({ ok: true });
}

export async function createUpdate(req: Request, res: Response): Promise<void> {
  const prayerId = Number(req.params.id);
  const { content } = req.body as { content: string };

  const prayer = await findPrayerOr404(prayerId, res);
  if (!prayer) return;

  // Create the update record
  const upd = await PrayerUpdate.create({ prayerId, authorUserId: req.user!.userId, content });

  // 1) Bump this prayer to the top of its current board by lowering its position.
  //    Choose (min position in same group/status) - 1 to preserve existing relative order.
  try {
    const minPosRaw = await Prayer.min('position', {
      where: { groupId: prayer.groupId, status: prayer.status }
    });

    // HARD bump if there are no existing positions (null) by defaulting to -1
    let nextPos = -1;
    if (typeof minPosRaw === 'number' && Number.isFinite(minPosRaw)) {
      nextPos = minPosRaw - 1;
    }

    prayer.position = nextPos;
    await prayer.save();

    // 2) Broadcast using legacy string AND typed enum (client back-compat)
    const payload = { prayer: toPrayerDTO(prayer) };
    try {
      emitToGroup(prayer.groupId, 'prayer:updated', payload);
    } catch { /* non-fatal */ }
    try {
      emitToGroup(prayer.groupId, Events.PrayerUpdated, payload);
    } catch { /* non-fatal */ }
  } catch {
    // If bump fails, the update itself still succeeds; UI just won’t auto-bump this time.
  }

  // Keep existing lightweight signal (some clients may rely on it)
  try {
    emitToGroup(prayer.groupId, 'update:created', { id: upd.id, prayerId });
  } catch {
    // non-fatal
  }

  // Send a simple update notice to the group via Resend (non-fatal)
  try {
    const group = await Group.findByPk(prayer.groupId);
    await sendEmailViaResend({
      to: group?.groupEmail ?? env.GROUP_EMAIL,
      subject: 'Prayer Updated',
      html: `<p>Prayer <b>${prayer.title}</b> was updated.</p><p>${content}</p>`
    });
  } catch {
    // ignore non-fatal email errors
  }

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
        size: f.size
      })
    )
  );
  res.json({ items: saved });
}
