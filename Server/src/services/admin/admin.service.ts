// Server/src/services/admin/admin.service.ts
import {Op, WhereOptions} from 'sequelize';
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
  const pageSize = typeof params.pageSize === 'number' && params.pageSize > 0 ? params.pageSize : 20;

  const like = params.q ? `%${params.q}%` : undefined;

  // ✅ Build in one object literal with computed key for Op.or
  const where: WhereOptions = {
    ...(params.groupId ? { groupId: params.groupId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(like
      ? {
        [Op.or]: [
          { title:   { [Op.iLike]: like } },
          { content: { [Op.iLike]: like } },
        ],
      }
      : {}),
  };

  const { rows, count } = await Prayer.findAndCountAll({
    where,
    include: [
      { model: Group, as: 'group', attributes: ['id', 'name'] },
      { model: User,  as: 'author', attributes: ['id', 'name'] },
    ],
    order: [['updatedAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const items = rows.map((p) => ({
    id: p.id,
    groupId: p.groupId,
    groupName: (p as any).group?.name ?? '',
    authorUserId: p.authorUserId,
    authorName: (p as any).author?.name ?? '',
    title: p.title,
    category: p.category,
    status: p.status,
    commentCount: p.commentCount ?? 0,
    lastCommentAt: p.lastCommentAt ?? null,
    updatedAt: p.updatedAt,
  }));

  return { items, total: count, page, pageSize };
}

export async function getPrayerComments(prayerId: number) {
  return await Comment.findAll({
    where: { prayerId, depth: 0, deletedAt: null },
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
}

export async function insertAdminComment(prayerId: number, adminId: number, content: string) {
  return await Comment.create({
    prayerId,
    parentId: null,
    threadRootId: null,
    depth: 0,
    authorId: adminId,
    content,
  });
}

export async function updatePrayerStatus(prayerId: number, status: Status) {
  const p = await Prayer.findByPk(prayerId);
  if (!p) return { ok: false, error: 'Not found' as const };
  p.status = status;
  await p.save();
  return { ok: true as const };
}
