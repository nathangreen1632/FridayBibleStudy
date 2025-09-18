import type { Request } from 'express';
import { Op } from 'sequelize';
import { Comment, GroupMember, Prayer, User } from '../models/index.js';
import { emitToGroup } from '../config/socket.config.js';
import { toPrayerDTO } from '../controllers/dto/prayer.dto.js';
import { Events } from '../types/socket.types.js';

export type SafeUser = {
  id: number;
  role: 'classic' | 'admin';
  groupId?: number | null;
  name?: string;
  email?: string;
};

export type UserLite = { name?: string | null; email?: string | null };

export function actor(req: Request): SafeUser | null {
  const u = (req as any).user as {
    userId?: number;
    role?: 'classic' | 'admin';
    groupId?: number | null;
    name?: string;
    email?: string;
  } | undefined;

  if (!u || typeof u.userId !== 'number') return null;
  if (u.role !== 'classic' && u.role !== 'admin') return null;

  return {
    id: u.userId,
    role: u.role,
    groupId: u.groupId ?? null,
    name: u.name,
    email: u.email,
  };
}

export function safeMessage(e: unknown, fb: string): string {
  if (e && typeof e === 'object' && 'message' in (e as any)) {
    const msg = (e as any).message;
    return typeof msg === 'string' && msg.trim() ? msg : fb;
  }
  return fb;
}

export async function loadUserMap(ids: number[]): Promise<Map<number, UserLite>> {
  const uniq = Array.from(new Set(ids.filter((v): v is number => Number.isFinite(v))));
  if (!uniq.length) return new Map();
  const rows = await User.findAll({
    attributes: ['id', 'name', 'email'],
    where: { id: { [Op.in]: uniq } },
  });
  const m = new Map<number, UserLite>();
  for (const u of rows as any[]) m.set(Number(u.id), { name: u.name ?? null, email: u.email ?? null });
  return m;
}

export function mapComment(c: Comment, users?: Map<number, UserLite>) {
  const plain = c.get({ plain: true }) as any;
  const u = users?.get(plain.authorId);
  return {
    id: plain.id,
    prayerId: plain.prayerId,
    parentId: plain.parentId ?? null,
    threadRootId: plain.threadRootId ?? null,
    depth: plain.depth ?? 0,
    authorId: plain.authorId,
    authorName: u?.name ?? null,
    content: plain.deletedAt ? '[deleted]' : (plain.content || ''),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt ?? null,
    deletedAt: plain.deletedAt ?? null,
  };
}

export function quoteIdent(x: string) {
  return `"${x.replace(/"/g, '""')}"`;
}
export function tableRefFromModel(m: any): string {
  try {
    const t = typeof m?.getTableName === 'function' ? m.getTableName() : 'comments';
    if (typeof t === 'string') return quoteIdent(t);
    if (t && typeof t === 'object') {
      const schema = t.schema ? quoteIdent(t.schema) + '.' : '';
      return schema + quoteIdent(t.tableName ?? 'comments');
    }
  } catch {}
  return quoteIdent('comments');
}

export type CreateBody = {
  prayerId?: number;
  content?: string;
  parentId?: number | null;
  cid?: string;
};

export function parseCreateBody(req: Request): {
  pid: number;
  content: string;
  parentId: number | null;
  cid: string | null;
} {
  const { prayerId, content, parentId, cid } = (req.body || {}) as CreateBody;
  const pid = Number(prayerId || 0);
  const safeContent = typeof content === 'string' ? content : '';
  const parent = typeof parentId === 'number' ? parentId : null;
  const clientCid = typeof cid === 'string' ? cid : null;
  return { pid, content: safeContent, parentId: parent, cid: clientCid };
}

export async function getOpenPrayer(pid: number): Promise<Prayer | null> {
  if (!pid) return null;
  const p = await Prayer.findByPk(pid);
  if (!p) return null;
  if (p.isCommentsClosed) return null;
  return p;
}

export async function resolveThreadInfo(parentId: number | null): Promise<{
  depth: number;
  threadRootId: number | null;
  parentResolvedId: number | null;
}> {
  if (!parentId) return { depth: 0, threadRootId: null, parentResolvedId: null };

  const parent = await Comment.findByPk(parentId);
  if (!parent) return { depth: 0, threadRootId: null, parentResolvedId: null };

  const parentDepth = parent.depth;
  const root = typeof parent.threadRootId === 'number' ? parent.threadRootId : parent.id;
  return { depth: parentDepth + 1, threadRootId: root, parentResolvedId: parent.id };
}

export async function insertComment(input: {
  pid: number;
  authorId: number;
  content: string;
  parentResolvedId: number | null;
  depth: number;
  threadRootId: number | null;
}): Promise<Comment> {
  const inserted = await Comment.create({
    prayerId: input.pid,
    parentId: input.parentResolvedId,
    threadRootId: input.threadRootId,
    depth: input.depth,
    authorId: input.authorId,
    content: input.content,
  });

  if (inserted.depth === 0) {
    await Comment.update({ threadRootId: inserted.id }, { where: { id: inserted.id } });
  }
  return inserted;
}

export function calcNewCounts(prayer: Prayer, inserted: Comment): {
  latestAt: Date;
  newCount: number;
} {
  const latestAt = inserted.createdAt || new Date();
  const rootDelta = inserted.depth === 0 ? 1 : 0;
  const base = typeof (prayer as any).commentCount === 'number' ? (prayer as any).commentCount : 0;
  return { latestAt, newCount: base + rootDelta };
}

export async function updatePrayerCounts(pid: number, latestAt: Date, newCount: number): Promise<void> {
  await Prayer.update({ commentCount: newCount, lastCommentAt: latestAt }, { where: { id: pid } });
}

export async function buildAuthorMapFor(userId: number): Promise<Map<number, UserLite>> {
  const uRow = await User.findByPk(userId, { attributes: ['id', 'name', 'email'] });
  const m = new Map<number, UserLite>();
  m.set(userId, { name: (uRow as any)?.name ?? null, email: (uRow as any)?.email ?? null });
  return m;
}

export function emitCreationEvents(args: {
  groupId: number;
  pid: number;
  payloadComment: ReturnType<typeof mapComment>;
  newCount: number;
  latestAt: Date;
}): void {
  try {
    emitToGroup(args.groupId, 'comment:created', {
      prayerId: args.pid,
      comment: args.payloadComment,
      newCount: args.newCount,
      lastCommentAt: args.latestAt,
    });
  } catch {}

  try {
    emitToGroup(args.groupId, 'prayer:commentCount', {
      prayerId: args.pid,
      newCount: args.newCount,
      lastCommentAt: args.latestAt,
    });
  } catch {}
}

export function emitUpdated(
  groupId: number,
  payload: { prayerId: number; comment: ReturnType<typeof mapComment> }
): void {
  try { emitToGroup(groupId, 'comment:updated', payload); } catch {}
}

export function emitDeleted(
  groupId: number,
  payload: { prayerId: number; commentId: number; newCount: number; lastCommentAt: Date | null }
): void {
  try { emitToGroup(groupId, 'comment:deleted', payload); } catch {}
  try {
    emitToGroup(groupId, 'prayer:commentCount', {
      prayerId: payload.prayerId,
      newCount: payload.newCount,
      lastCommentAt: payload.lastCommentAt,
    });
  } catch {}
}

export function emitCommentsClosed(
  groupId: number,
  payload: { prayerId: number; isCommentsClosed: boolean }
): void {
  try { emitToGroup(groupId, 'prayer:commentsClosed', payload); } catch {}
}

export async function bumpCardIfRoot(prayer: Prayer, inserted: Comment): Promise<void> {
  if (inserted.depth !== 0) return;

  try {
    const minPosRaw = await Prayer.min('position', {
      where: { groupId: prayer.groupId, status: (prayer as any).status },
    });

    let nextPos = -1;
    if (typeof minPosRaw === 'number' && Number.isFinite(minPosRaw)) nextPos = minPosRaw - 1;

    await Prayer.update({ position: nextPos }, { where: { id: inserted.prayerId } });

    const updatedPrayer = await Prayer.findByPk(inserted.prayerId, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
    });
    if (!updatedPrayer) return;

    try { emitToGroup(prayer.groupId, 'update:created', { id: inserted.id, prayerId: inserted.prayerId }); } catch {}

    const payload = { prayer: toPrayerDTO(updatedPrayer) };
    try { emitToGroup(prayer.groupId, 'prayer:updated', payload); } catch {}
    try { emitToGroup(prayer.groupId, Events.PrayerUpdated, payload); } catch {}
  } catch {

  }
}

export async function bestEffortNotify(prayer: Prayer, content: string): Promise<void> {
  try {
    const author = await User.findByPk((prayer as any).authorUserId);
    const admins = await GroupMember.findAll({
      where: { groupId: (prayer as any).groupId },
      include: [{ model: User }],
    });

    const to: string[] = [];
    if ((author as any)?.email) to.push((author as any).email);

    for (const gm of admins as any[]) {
      const isAdmin = gm?.user?.role === 'admin';
      const email = gm?.user?.email;
      if (isAdmin && email) to.push(email);
    }
    if (!to.length) return;

    const { sendEmail } = await import('../services/email.service.js');
    const safeHtml = `<p>A new comment was added:</p><blockquote>${(content || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</blockquote>`;

    await sendEmail({
      to,
      subject: `New comment on “${(prayer as any).title}”`,
      html: safeHtml,
    }).catch(() => {});
  } catch {

  }
}
