// Server/src/controllers/comments.controller.ts
import type { Request, Response, Router } from 'express';
import { Router as makeRouter } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { requireAuth } from '../middleware/auth.middleware.js';
import { recaptchaGuard } from '../middleware/recaptcha.middleware.js';
import { Comment, CommentRead, Prayer } from '../models/index.js';
import { sequelize } from '../config/sequelize.config.js';
import {
  actor,
  safeMessage,
  loadUserMap,
  mapComment,
  tableRefFromModel,
  parseCreateBody,
  getOpenPrayer,
  resolveThreadInfo,
  insertComment,
  calcNewCounts,
  updatePrayerCounts,
  buildAuthorMapFor,
  emitCreationEvents,
  bumpCardIfRoot,
  bestEffortNotify,
  emitUpdated,
  emitDeleted,
  emitCommentsClosed,
} from '../helpers/commentsController.helper.js';

export const commentsRouter: Router = makeRouter();

/**
 * GET /comments/list?prayerId=&cursor=&limit=
 * Paginates root threads for a prayer by latest activity (root.createdAt or newest reply).
 * Returns preview of up to 3 newest replies per root.
 */
commentsRouter.get('/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const prayerId = Number(req.query.prayerId || '0');
    const limit = Number(req.query.limit || '10');
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    if (!prayerId) {
      return res.status(200).json({ items: [], cursor: null, hasMore: false, commentCount: 0, lastCommentAt: null, isCommentsClosed: false });
    }

    const prayer = await Prayer.findByPk(prayerId);
    if (!prayer) {
      return res.status(200).json({ items: [], cursor: null, hasMore: false, commentCount: 0, lastCommentAt: null, isCommentsClosed: false });
    }

    const CT = tableRefFromModel(Comment);

    const sql = `
        with latest_activity as (
            select
                c.id as root_id,
                greatest(
                        c."createdAt",
                        coalesce((select max("createdAt") from ${CT} cr where cr."threadRootId" = c.id and cr."deletedAt" is null), c."createdAt")
                ) as last_activity_at
            from ${CT} c
            where c."prayerId" = :prayerId and c.depth = 0 and c."deletedAt" is null
        )
        select c.*, la.last_activity_at
        from ${CT} c
                 join latest_activity la on la.root_id = c.id
        where c."prayerId" = :prayerId and c.depth = 0 and c."deletedAt" is null
            ${cursor ? 'and la.last_activity_at < :cursor' : ''}
        order by la.last_activity_at desc
        limit :limit
    `;

    const roots = (await sequelize.query(sql, {
      replacements: { prayerId, limit, cursor },
      type: QueryTypes.SELECT,
      mapToModel: true,
      model: Comment,
    })) as unknown as Array<Comment & { last_activity_at?: Date }>;

    const repliesByRoot = new Map<number, Comment[]>();
    const authorIds = new Set<number>();
    for (const r of roots) {
      authorIds.add((r as any).authorId);
      const last3 = await Comment.findAll({
        where: { threadRootId: r.id, deletedAt: null, depth: { [Op.gt]: 0 } },
        order: [['createdAt', 'DESC']],
        limit: 3,
      });
      repliesByRoot.set(r.id, last3);
      for (const rr of last3 as any[]) authorIds.add(rr.authorId);
    }
    const userMap = await loadUserMap([...authorIds]);

    const items: Array<{ root: any; repliesPreview: any[]; hasMoreReplies: boolean }> = [];
    for (const r of roots) {
      const previewRows = repliesByRoot.get(r.id) ?? [];
      const preview = previewRows.slice().reverse().map((row) => mapComment(row, userMap));
      const count = await Comment.count({ where: { threadRootId: r.id, deletedAt: null, depth: { [Op.gt]: 0 } } });
      items.push({ root: mapComment(r, userMap), repliesPreview: preview, hasMoreReplies: count > preview.length });
    }

    const newCursor = roots.length
      ? ((roots[roots.length - 1] as any).last_activity_at ?? roots[roots.length - 1].createdAt ?? null)
      : null;

    return res.status(200).json({
      items,
      cursor: newCursor,
      hasMore: !!newCursor,
      commentCount: (prayer as any).commentCount ?? 0,
      lastCommentAt: (prayer as any).lastCommentAt ?? null,
      isCommentsClosed: !!(prayer as any).isCommentsClosed,
    });
  } catch (e) {
    return res
      .status(200)
      .json({ items: [], cursor: null, hasMore: false, commentCount: 0, lastCommentAt: null, isCommentsClosed: false, error: safeMessage(e, 'error') });
  }
});

/** GET /comments/replies?rootId=&limit= */
commentsRouter.get('/replies', requireAuth, async (req: Request, res: Response) => {
  try {
    const rootId = Number(req.query.rootId || '0');
    const limit = Number(req.query.limit || '10');
    if (!rootId) return res.status(200).json({ items: [], cursor: null, hasMore: false });

    const rows = await Comment.findAll({
      where: { threadRootId: rootId, deletedAt: null, depth: { [Op.gt]: 0 } },
      order: [['createdAt', 'ASC']],
      limit,
    });

    const userMap = await loadUserMap(rows.map((r: any) => Number(r.authorId)));
    return res.status(200).json({ items: rows.map((r) => mapComment(r, userMap)), cursor: null, hasMore: false });
  } catch (e) {
    return res.status(200).json({ items: [], cursor: null, hasMore: false, error: safeMessage(e, 'error') });
  }
});

/** POST /comments/create  body: { prayerId, content, parentId?, cid? } */
commentsRouter.post(
  '/create',
  requireAuth,
  recaptchaGuard('comment_create'),
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });

      const { pid, content, parentId, cid } = parseCreateBody(req);
      if (!pid) return res.status(200).json({ ok: false, error: 'prayerId required' });

      const prayer = await getOpenPrayer(pid);
      if (!prayer) return res.status(200).json({ ok: false, error: 'prayer not found or comments closed' });

      const { depth, threadRootId, parentResolvedId } = await resolveThreadInfo(parentId);

      const inserted = await insertComment({
        pid,
        authorId: u.id,
        content,
        parentResolvedId,
        depth,
        threadRootId,
      });

      const { latestAt, newCount } = calcNewCounts(prayer, inserted);
      await updatePrayerCounts(pid, latestAt, newCount);

      const authorMap = await buildAuthorMapFor(u.id);
      const payloadComment = mapComment(inserted, authorMap);

      emitCreationEvents({
        groupId: (prayer as any).groupId,
        pid,
        payloadComment,
        newCount,
        latestAt,
      });

      await bumpCardIfRoot(prayer, inserted);
      await bestEffortNotify(prayer, content);

      return res.status(200).json({ ok: true, comment: payloadComment, cid: cid ?? null });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'create failed') });
    }
  }
);

/** PATCH /comments/:commentId  body: { content } */
commentsRouter.patch(
  '/:commentId',
  requireAuth,
  recaptchaGuard('comment_update'),
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      const commentId = Number(req.params.commentId);
      const { content } = (req.body || {}) as { content?: string };

      const c = await Comment.findByPk(commentId);
      if (!c) return res.status(200).json({ ok: false, error: 'not found' });

      const prayer = await Prayer.findByPk((c as any).prayerId);
      if (!prayer) return res.status(200).json({ ok: false, error: 'prayer missing' });
      if ((prayer as any).isCommentsClosed) return res.status(200).json({ ok: false, error: 'comments closed' });

      const isOwner = (c as any).authorId === u.id;
      const isPrayerAuthor = (prayer as any).authorUserId === u.id;
      const isAdmin = u.role === 'admin';
      if (!isOwner && !isPrayerAuthor && !isAdmin) return res.status(200).json({ ok: false, error: 'forbidden' });

      await Comment.update({ content: content || '', updatedAt: new Date() }, { where: { id: commentId } });
      const updated = await Comment.findByPk(commentId);
      if (!updated) return res.status(200).json({ ok: false, error: 'update failed' });

      const authorMap = await loadUserMap([(c as any).authorId]);
      const payload = mapComment(updated, authorMap);

      // ⬇️ NEW: notify clients about the comment update
      emitUpdated((prayer as any).groupId, { prayerId: (c as any).prayerId, comment: payload });

      return res.status(200).json({ ok: true, comment: payload });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'update failed') });
    }
  }
);

/** DELETE /comments/:commentId */
commentsRouter.delete(
  '/:commentId',
  requireAuth,
  recaptchaGuard('comment_delete'),
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      const commentId = Number(req.params.commentId);

      const c = await Comment.findByPk(commentId);
      if (!c) return res.status(200).json({ ok: false, error: 'not found' });

      const prayer = await Prayer.findByPk((c as any).prayerId);
      if (!prayer) return res.status(200).json({ ok: false, error: 'prayer missing' });
      if ((prayer as any).isCommentsClosed) return res.status(200).json({ ok: false, error: 'comments closed' });

      const isOwner = (c as any).authorId === u.id;
      const isPrayerAuthor = (prayer as any).authorUserId === u.id;
      const isAdmin = u.role === 'admin';
      if (!isOwner && !isPrayerAuthor && !isAdmin) return res.status(200).json({ ok: false, error: 'forbidden' });

      await Comment.update({ deletedAt: new Date() }, { where: { id: commentId } });

      const base = (prayer as any).commentCount ?? 0;
      const rootDelta = (c as any).depth === 0 ? -1 : 0;
      const newCount = Math.max(base + rootDelta, 0);

      const last = await Comment.findOne({
        where: { prayerId: (c as any).prayerId, deletedAt: null },
        order: [['createdAt', 'DESC']],
      });
      const lastAt = (last as any)?.createdAt ?? null;

      await Prayer.update({ commentCount: newCount, lastCommentAt: lastAt }, { where: { id: (c as any).prayerId } });

      // ⬇️ NEW: notify clients about deletion + updated counts
      emitDeleted((prayer as any).groupId, {
        prayerId: (c as any).prayerId,
        commentId: (c as any).id,
        newCount,
        lastCommentAt: lastAt,
      });

      return res.status(200).json({ ok: true, commentId: (c as any).id, lastCommentAt: lastAt });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'delete failed') });
    }
  }
);

/** POST /comments/seen  body: { prayerId, at? } */
commentsRouter.post(
  '/seen',
  requireAuth,
  recaptchaGuard('comment_seen'),
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      const prayerId = Number(req.body?.prayerId || '0');
      const at = typeof req.body?.at === 'string' ? new Date(req.body.at) : new Date();
      if (!prayerId) return res.status(200).json({ ok: false, error: 'prayerId required' });

      await CommentRead.upsert({ prayerId, userId: u.id, lastSeenAt: at });
      return res.status(200).json({ ok: true, lastSeenAt: at.toISOString() });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'seen failed') });
    }
  }
);

/** PATCH /comments/closed  body: { prayerId, isClosed }  (admin only) */
commentsRouter.patch(
  '/closed',
  requireAuth,
  recaptchaGuard('comment_closed_toggle'),
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      if (u.role !== 'admin') return res.status(200).json({ ok: false, error: 'forbidden' });

      const prayerId = Number(req.body?.prayerId || '0');
      const isClosed = !!req.body?.isClosed;
      if (!prayerId) return res.status(200).json({ ok: false, error: 'prayerId required' });

      const p = await Prayer.findByPk(prayerId);
      if (!p) return res.status(200).json({ ok: false, error: 'not found' });

      await Prayer.update({ isCommentsClosed: isClosed }, { where: { id: prayerId } });

      // ⬇️ NEW: notify clients that comments-open state changed
      emitCommentsClosed((p as any).groupId, { prayerId, isCommentsClosed: isClosed });

      return res.status(200).json({ ok: true, prayerId, isCommentsClosed: isClosed });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'toggle failed') });
    }
  }
);

/** GET /comments/search?q=&groupId=&limit= */
commentsRouter.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const groupId = Number(req.query.groupId || '0');
    const limit = Math.min(Number(req.query.limit || '50'), 100);
    if (!q || !groupId) return res.status(200).json({ items: [], cursor: null, hasMore: false });

    const rows = await Prayer.findAll({
      where: {
        groupId,
        [Op.or]: [{ title: { [Op.iLike]: `%${q}%` } }, { content: { [Op.iLike]: `%${q}%` } }],
      },
      limit,
    });

    const comments = await Comment.findAll({
      attributes: ['prayerId'],
      where: { content: { [Op.iLike]: `%${q}%` }, deletedAt: null },
      group: ['prayerId'],
      limit,
    });
    const idsFromComments = new Set<number>((comments as any[]).map((r) => r.prayerId));
    const allIds = new Set<number>([...rows.map((r) => (r as any).id), ...idsFromComments]);

    const prayers = await Prayer.findAll({ where: { id: { [Op.in]: [...allIds] }, groupId }, limit });

    const items = prayers.map((p) => ({
      prayerId: (p as any).id,
      title: (p as any).title,
      matchedIn: ['title', 'description', 'comments'],
      snippet: null,
    }));

    return res.status(200).json({ items, cursor: null, hasMore: false });
  } catch (e) {
    return res.status(200).json({ items: [], cursor: null, hasMore: false, error: safeMessage(e, 'search failed') });
  }
});

export default commentsRouter;
