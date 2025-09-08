import {col, fn, Op, WhereOptions} from 'sequelize';
import {Comment, Group, Prayer, User} from '../../models/index.js';
import type {Category, Status} from '../../models/prayer.model.js';

export type ListPrayersParams = {
  q?: string;
  groupId?: number;
  status?: Status;
  category?: Category;
  page?: number;
  pageSize?: number;
};

export async function findPrayersForAdmin(params: ListPrayersParams) {
  const page = typeof params.page === 'number' && params.page > 0 ? params.page : 1;
  const rawSize =
    typeof params.pageSize === 'number' && params.pageSize > 0
      ? params.pageSize
      : 10;
  const pageSize = Math.min(rawSize, 10); // enforce cap


  const like = params.q ? `%${params.q}%` : undefined;

  const where: WhereOptions = {
    ...(params.groupId ? { groupId: params.groupId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(like ? { [Op.or]: [{ title: { [Op.iLike]: like } }, { content: { [Op.iLike]: like } }] } : {}),
  };

  try {
    const { rows, count } = await Prayer.findAndCountAll({
      where,
      attributes: {
        // COALESCE("Prayer"."lastCommentAt","Prayer"."updatedAt") AS "lastActivity"
        include: [[fn('COALESCE', col('Prayer.lastCommentAt'), col('Prayer.updatedAt')), 'lastActivity']],
      },
      include: [
        { model: Group, as: 'group', attributes: ['id', 'name'], required: false },
        { model: User, as: 'author', attributes: ['id', 'name', 'role'], required: true },
      ],
      order: [[col('lastActivity'), 'DESC'], ['id', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      subQuery: false,
    });

    const items = rows.map((p) => {
      const plain = p.get({ plain: true }) as any;
      return {
        id: plain.id,
        groupId: plain.groupId,
        groupName: plain.group?.name ?? '',
        authorUserId: plain.authorUserId,
        authorName: plain.author?.name ?? '',
        title: plain.title ?? '',
        category: plain.category,
        status: plain.status,
        commentCount: typeof plain.commentCount === 'number' ? plain.commentCount : 0,
        lastCommentAt: plain.lastCommentAt ?? null,
        updatedAt: plain.updatedAt,
        lastActivity: plain.lastActivity,
      };
    });

    return { items, total: count, page, pageSize };
  } catch {
    // graceful fallback
    return { items: [], total: 0, page, pageSize };
  }
}

/** Root-level comments for an admin thread view (no deleted, newest first). */
export async function getPrayerComments(prayerId: number) {
  try {
    return await Comment.findAll({
      where: { prayerId, depth: 0, deletedAt: null },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
  } catch {
    return [];
  }
}

/** Post an admin-authored root comment. */
export async function insertAdminComment(prayerId: number, adminId: number, content: string) {
  try {
    const c = await Comment.create({
      prayerId,
      parentId: null,
      threadRootId: null,
      depth: 0,
      authorId: adminId,
      content,
    });
    return { ok: true as const, comment: c };
  } catch {
    return { ok: false as const, error: 'Unable to create comment' as const };
  }
}

/** Update prayer status (active/praise/archived) with graceful checks. */
export async function updatePrayerStatus(prayerId: number, status: Status) {
  try {
    const p = await Prayer.findByPk(prayerId);
    if (!p) return { ok: false as const, error: 'Not found' as const };
    p.status = status;
    await p.save();
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Unable to update status' as const };
  }
}

export async function findPrayerByIdForAdmin(id: number) {
  if (!id || Number.isNaN(Number(id))) return null;

  try {
    return await Prayer.findByPk(id, {
      attributes: {
        // expose a stable "lastActivity" like the list does
        include: [[fn('COALESCE', col('Prayer.lastCommentAt'), col('Prayer.updatedAt')), 'lastActivity']],
      },
      include: [
        {model: Group, as: 'group', attributes: ['id', 'name'], required: false},
        {model: User, as: 'author', attributes: ['id', 'name', 'role'], required: true},
      ],
    });
  } catch {
    return null; // graceful fallback; controller returns 500 on unexpected errors
  }
}