import {col, fn, Op, WhereOptions} from 'sequelize';
import {Comment, Group, Prayer, User} from '../../models/index.js';
import type {Category, Status} from '../../models/prayer.model.js';
import {
  getOpenPrayer,
  resolveThreadInfo,
  insertComment,
  calcNewCounts,
  updatePrayerCounts,
  buildAuthorMapFor,
  mapComment,
  emitCreationEvents,
  bumpCardIfRoot,
  bestEffortNotify,
} from '../../helpers/commentsController.helper.js';

type PlainPrayerRow = {
  id: number;
  groupId: number;
  group?: { name?: string | null } | null;
  authorUserId: number;
  author?: { name?: string | null } | null;
  title?: string | null;
  category: Category;
  status: Status;
  commentCount?: number | null;
  lastCommentAt?: Date | string | null;
  updatedAt: Date | string;
  lastActivity?: Date | string | null;
};

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
      const plain: PlainPrayerRow = p.get({ plain: true });

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
        lastActivity: plain.lastActivity ?? plain.updatedAt,
      };
    });

    return { items, total: count, page, pageSize };
  } catch {

    return { items: [], total: 0, page, pageSize };
  }
}

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

export async function insertAdminComment(
  prayerId: number,
  adminId: number,
  content: string
): Promise<
  | { ok: true; comment: ReturnType<typeof mapComment>; newCount: number; lastCommentAt: Date | null }
  | { ok: false; error: string }
> {
  try {
    const prayer = await getOpenPrayer(prayerId);
    if (!prayer) return { ok: false, error: 'Prayer not found or comments closed' };

    const { depth, threadRootId, parentResolvedId } = await resolveThreadInfo(null);

    const inserted = await insertComment({
      pid: prayerId,
      authorId: adminId,
      content,
      parentResolvedId,
      depth,
      threadRootId,
    });

    const { latestAt, newCount } = calcNewCounts(prayer, inserted);
    await updatePrayerCounts(prayerId, latestAt, newCount);

    const authorMap = await buildAuthorMapFor(adminId);
    const payloadComment = mapComment(inserted, authorMap);

    emitCreationEvents({
      groupId: (prayer as any).groupId,
      pid: prayerId,
      payloadComment,
      newCount,
      latestAt: latestAt ?? new Date(),
    });

    await bumpCardIfRoot(prayer, inserted);

    await bestEffortNotify(prayer, content);

    return { ok: true, comment: payloadComment, newCount, lastCommentAt: latestAt ?? null };
  } catch {

    return { ok: false, error: 'Unable to create comment' };
  }
}

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
        include: [[fn('COALESCE', col('Prayer.lastCommentAt'), col('Prayer.updatedAt')), 'lastActivity']],
      },
      include: [
        {model: Group, as: 'group', attributes: ['id', 'name'], required: false},
        {model: User, as: 'author', attributes: ['id', 'name', 'role'], required: true},
      ],
    });
  } catch {
    return null;
  }
}