// Server/src/controllers/comments.controller.ts
import type { Request, Response, Router } from 'express';
import { Router as makeRouter } from 'express';
import { Op, QueryTypes } from 'sequelize'; // ✅ import QueryTypes directly
import { requireAuth } from '../middleware/auth.middleware.js';
import { recaptchaGuard } from '../middleware/recaptcha.middleware.js'; // ✅ use explicit guard
import { Comment, CommentRead, Prayer, User, GroupMember } from '../models/index.js';
import { emitToGroup } from '../config/socket.config.js';
import { sequelize } from '../config/sequelize.config.js';

type SafeUser = { id: number; role: 'classic' | 'admin'; groupId?: number | null; name?: string; email?: string };

function actor(req: Request): SafeUser | null {
  const u = (req as any).user as SafeUser | undefined;
  return u ?? null;
}

function safeMessage(e: unknown, fb: string): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as any).message || fb);
  return fb;
}

function mapComment(c: Comment) {
  const plain = c.get({ plain: true }) as any;
  return {
    id: plain.id,
    prayerId: plain.prayerId,
    parentId: plain.parentId ?? null,
    threadRootId: plain.threadRootId ?? null,
    depth: plain.depth ?? 0,
    authorId: plain.authorId,
    content: plain.deletedAt ? '[deleted]' : (plain.content || ''),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt ?? null,
    deletedAt: plain.deletedAt ?? null,
  };
}

// Quote an identifier for Postgres; also supports { schema, tableName } from Sequelize getTableName()
function quoteIdent(x: string) {
  return `"${x.replace(/"/g, '""')}"`;
}
function tableRefFromModel(m: any): string {
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

    // Use the actual table name as registered by Sequelize (handles schema-qualified names)
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
      type: QueryTypes.SELECT, // ✅ correct usage
      mapToModel: true,
      model: Comment,
    })) as unknown as Array<Comment & { last_activity_at?: Date }>;

    const items: Array<{ root: any; repliesPreview: any[]; hasMoreReplies: boolean }> = [];
    for (const r of roots) {
      const last3 = await Comment.findAll({
        where: { threadRootId: r.id, deletedAt: null, depth: { [Op.gt]: 0 } },
        order: [['createdAt', 'DESC']],
        limit: 3,
      });
      // Avoid ES2023 toReversed() for broader Node targets
      const preview = last3.slice().reverse().map(mapComment);
      const count = await Comment.count({ where: { threadRootId: r.id, deletedAt: null, depth: { [Op.gt]: 0 } } });
      items.push({ root: mapComment(r), repliesPreview: preview, hasMoreReplies: count > preview.length });
    }

    const newCursor = roots.length
      ? ((roots[roots.length - 1] as any).last_activity_at ?? roots[roots.length - 1].createdAt ?? null)
      : null;

    return res.status(200).json({
      items,
      cursor: newCursor,
      hasMore: !!newCursor,
      commentCount: prayer.commentCount ?? 0,
      lastCommentAt: prayer.lastCommentAt ?? null,
      isCommentsClosed: !!prayer.isCommentsClosed,
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

    return res.status(200).json({ items: rows.map(mapComment), cursor: null, hasMore: false });
  } catch (e) {
    return res.status(200).json({ items: [], cursor: null, hasMore: false, error: safeMessage(e, 'error') });
  }
});

/** POST /comments/create  body: { prayerId, content, parentId?, cid? } */
commentsRouter.post(
  '/create',
  requireAuth,
  recaptchaGuard('comment_create'), // ✅ explicit action
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      const { prayerId, content, parentId, cid } = (req.body || {}) as {
        prayerId?: number;
        content?: string;
        parentId?: number | null;
        cid?: string;
      };
      const pid = Number(prayerId || 0);
      if (!pid) return res.status(200).json({ ok: false, error: 'prayerId required' });

      const prayer = await Prayer.findByPk(pid);
      if (!prayer) return res.status(400).json({ ok: false, error: 'prayer not found' });
      if (prayer.isCommentsClosed) return res.status(200).json({ ok: false, error: 'comments closed' });

      let depth = 0;
      let threadRootId: number | null = null;
      let parent: Comment | null = null;
      if (parentId) {
        parent = await Comment.findByPk(parentId);
        if (parent) {
          depth = (parent.depth || 0) + 1;
          threadRootId = parent.threadRootId ?? parent.id;
        }
      }

      const inserted = await Comment.create({
        prayerId: pid,
        parentId: parent ? parent.id : null,
        threadRootId,
        depth,
        authorId: u.id,
        content: content || '',
      });

      if (inserted.depth === 0) {
        await Comment.update({ threadRootId: inserted.id }, { where: { id: inserted.id } });
      }

      const latestAt = inserted.createdAt || new Date();
      await Prayer.update(
        {
          commentCount: (prayer.commentCount ?? 0) + 1,
          lastCommentAt: latestAt,
        },
        { where: { id: pid } }
      );

      emitToGroup(prayer.groupId, 'comment:created', {
        prayerId: pid,
        comment: mapComment(inserted),
        newCount: (prayer.commentCount ?? 0) + 1,
        lastCommentAt: latestAt,
      });
      emitToGroup(prayer.groupId, 'prayer:commentCount', {
        prayerId: pid,
        newCount: (prayer.commentCount ?? 0) + 1,
        lastCommentAt: latestAt,
      });

      // best-effort mail
      try {
        const author = await User.findByPk(prayer.authorUserId);
        const admins = await GroupMember.findAll({ where: { groupId: prayer.groupId }, include: [{ model: User }] });
        const to: string[] = [];
        if (author?.email) to.push(author.email);
        for (const gm of admins as any[]) {
          if (gm?.user?.role === 'admin' && gm.user.email) to.push(gm.user.email);
        }
        if (to.length) {
          const { sendEmail } = await import('../services/email.service.js');
          await sendEmail({
            to,
            subject: `New comment on “${prayer.title}”`,
            html: `<p>A new comment was added:</p><blockquote>${(content || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')}</blockquote>`,
          }).catch(() => {});
        }
      } catch {}

      return res.status(200).json({ ok: true, comment: mapComment(inserted), cid: cid ?? null });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'create failed') });
    }
  }
);

/** PATCH /comments/:commentId  body: { content } */
commentsRouter.patch(
  '/:commentId',
  requireAuth,
  recaptchaGuard('comment_update'), // ✅ explicit action
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      const commentId = Number(req.params.commentId);
      const { content } = (req.body || {}) as { content?: string };

      const c = await Comment.findByPk(commentId);
      if (!c) return res.status(200).json({ ok: false, error: 'not found' });

      const prayer = await Prayer.findByPk(c.prayerId);
      if (!prayer) return res.status(200).json({ ok: false, error: 'prayer missing' });
      if (prayer.isCommentsClosed) return res.status(200).json({ ok: false, error: 'comments closed' });

      const isOwner = c.authorId === u.id;
      const isPrayerAuthor = prayer.authorUserId === u.id;
      const isAdmin = u.role === 'admin';
      if (!isOwner && !isPrayerAuthor && !isAdmin) return res.status(200).json({ ok: false, error: 'forbidden' });

      await Comment.update({ content: content || '', updatedAt: new Date() }, { where: { id: commentId } });
      const updated = await Comment.findByPk(commentId);
      if (!updated) return res.status(200).json({ ok: false, error: 'update failed' });

      emitToGroup(prayer.groupId, 'comment:updated', { prayerId: c.prayerId, comment: mapComment(updated) });
      return res.status(200).json({ ok: true, comment: mapComment(updated) });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'update failed') });
    }
  }
);

/** DELETE /comments/:commentId */
commentsRouter.delete(
  '/:commentId',
  requireAuth,
  recaptchaGuard('comment_delete'), // ✅ explicit action
  async (req: Request, res: Response) => {
    try {
      const u = actor(req);
      if (!u) return res.status(401).json({ ok: false, error: 'unauthorized' });
      const commentId = Number(req.params.commentId);

      const c = await Comment.findByPk(commentId);
      if (!c) return res.status(200).json({ ok: false, error: 'not found' });

      const prayer = await Prayer.findByPk(c.prayerId);
      if (!prayer) return res.status(200).json({ ok: false, error: 'prayer missing' });
      if (prayer.isCommentsClosed) return res.status(200).json({ ok: false, error: 'comments closed' });

      const isOwner = c.authorId === u.id;
      const isPrayerAuthor = prayer.authorUserId === u.id;
      const isAdmin = u.role === 'admin';
      if (!isOwner && !isPrayerAuthor && !isAdmin) return res.status(200).json({ ok: false, error: 'forbidden' });

      await Comment.update({ deletedAt: new Date() }, { where: { id: commentId } });

      const newCount = Math.max((prayer.commentCount ?? 1) - 1, 0);
      const last = await Comment.findOne({
        where: { prayerId: c.prayerId, deletedAt: null },
        order: [['createdAt', 'DESC']],
      });
      const lastAt = last?.createdAt ?? null;
      await Prayer.update({ commentCount: newCount, lastCommentAt: lastAt }, { where: { id: c.prayerId } });

      emitToGroup(prayer.groupId, 'comment:deleted', {
        prayerId: c.prayerId,
        commentId: c.id,
        newCount: newCount,
        lastCommentAt: lastAt,
      });
      emitToGroup(prayer.groupId, 'prayer:commentCount', {
        prayerId: c.prayerId,
        newCount: newCount,
        lastCommentAt: lastAt,
      });

      return res.status(200).json({ ok: true, commentId: c.id, lastCommentAt: lastAt });
    } catch (e) {
      return res.status(200).json({ ok: false, error: safeMessage(e, 'delete failed') });
    }
  }
);

/** POST /comments/seen  body: { prayerId, at? } */
commentsRouter.post(
  '/seen',
  requireAuth,
  recaptchaGuard('comment_seen'), // ✅ explicit action
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
  recaptchaGuard('comment_closed_toggle'), // ✅ explicit action (admin)
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
      emitToGroup(p.groupId, 'prayer:commentsClosed', { prayerId, isCommentsClosed: isClosed });

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
    const allIds = new Set<number>([...rows.map((r) => r.id), ...idsFromComments]);

    const prayers = await Prayer.findAll({ where: { id: { [Op.in]: [...allIds] }, groupId }, limit });

    const items = prayers.map((p) => ({
      prayerId: p.id,
      title: p.title,
      matchedIn: ['title', 'description', 'comments'],
      snippet: null,
    }));

    return res.status(200).json({ items, cursor: null, hasMore: false });
  } catch (e) {
    return res.status(200).json({ items: [], cursor: null, hasMore: false, error: safeMessage(e, 'search failed') });
  }
});

export default commentsRouter;
