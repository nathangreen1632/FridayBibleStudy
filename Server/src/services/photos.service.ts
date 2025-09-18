import { Op } from 'sequelize';
import { Attachment, Prayer, User } from '../models/index.js';

export type PhotoDto = {
  id: number;
  url: string;
  filename: string;
  userId: number;
  uploaderName: string;
  createdAt: string;
  note?: string | null;
};

function totalBytes(files: Express.Multer.File[]): number {
  return files.reduce((acc, f) => acc + (f.size || 0), 0);
}

function toPublicUrl(a: any): string {
  if (typeof a?.filePath === 'string' && a.filePath.length > 0) {
    return a.filePath.startsWith('/') ? a.filePath : `/${a.filePath}`;
  }
  if (typeof a?.fileName === 'string' && a.fileName.length > 0) {
    return `/uploads/${a.fileName}`;
  }
  return '/uploads/placeholder.png';
}

function safeIso(input: unknown): string {
  try {
    const d = new Date(String(input));
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function listPhotoDtos(page: number, pageSize: number): Promise<{
  items: PhotoDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { rows, count } = await Attachment.findAndCountAll({
    where: { mimeType: { [Op.iLike]: 'image/%' } },
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  const prayerIds = Array.from(
    new Set(rows.map((a: any) => Number(a.prayerId)).filter((n) => Number.isFinite(n) && n > 0))
  );

  const prayers = prayerIds.length
    ? await Prayer.findAll({
      where: { id: { [Op.in]: prayerIds } },
      attributes: ['id', 'authorUserId'],
    })
    : [];

  const ownerByPrayer = new Map<number, number>();
  for (const p of prayers as any[]) {
    ownerByPrayer.set(Number(p.id), Number(p.authorUserId) || 0);
  }

  const ownerIds = Array.from(new Set(Array.from(ownerByPrayer.values()).filter((n) => n > 0)));
  const owners = ownerIds.length
    ? await User.findAll({ where: { id: { [Op.in]: ownerIds } }, attributes: ['id', 'name'] })
    : [];
  const nameById = new Map<number, string>();
  for (const u of owners as any[]) nameById.set(Number(u.id), String(u.name ?? 'Unknown'));

  const items: PhotoDto[] = rows.map((a: any) => {
    const pid = Number(a.prayerId) || 0;
    const ownerId = ownerByPrayer.get(pid) ?? 0;
    return {
      id: a.id,
      url: toPublicUrl(a),
      filename: a.fileName ?? '',
      userId: ownerId,
      uploaderName: nameById.get(ownerId) ?? 'Unknown',
      createdAt: safeIso(a.createdAt),
      note: a.note ?? null,
    };
  });

  return { items, total: count, page, pageSize };
}

export async function deletePhotoIfAllowed(
  attachmentId: number,
  me: { id: number; role: string } | undefined
) {
  if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
    return { ok: false, status: 400, error: 'Invalid id' };
  }

  const att: any = await Attachment.findByPk(attachmentId);
  if (!att) return { ok: false, status: 404, error: 'Not found' };

  const pid = Number(att.prayerId);
  const prayer = Number.isFinite(pid) && pid > 0
    ? await Prayer.findByPk(pid, { attributes: ['id', 'authorUserId'] })
    : null;

  const ownerId = Number((prayer as any)?.authorUserId) || 0;
  const isOwner = me && Number(me.id) === ownerId;
  const isAdmin = me && me.role === 'admin';

  if (!isOwner && !isAdmin) return { ok: false, status: 403, error: 'Forbidden' };

  await att.destroy();
  return { ok: true, status: 200 as const };
}

export async function resolveTargetPrayerId(
  explicitPrayerId: number | undefined,
  me: { id: number } | undefined
): Promise<number | null> {
  if (Number.isFinite(explicitPrayerId) && (explicitPrayerId as number) > 0) {
    return explicitPrayerId as number;
  }
  if (!me?.id) return null;

  const latest = await Prayer.findOne({
    where: { authorUserId: me.id },
    order: [['createdAt', 'DESC']],
    attributes: ['id'],
  });

  return latest ? Number(latest.id) : null;
}

export async function saveUploadedPhotos(
  files: Express.Multer.File[],
  prayerId: number,
  note?: string | null
): Promise<number[]> {
  if (!Array.isArray(files) || files.length === 0) return [];

  const ids: number[] = [];
  for (const f of files) {
    try {
      const row = await Attachment.create({
        prayerId,
        filePath: `uploads/${f.filename}`,
        fileName: f.originalname,
        mimeType: f.mimetype || 'application/octet-stream',
        size: f.size || 0,
        note: note ?? null,
      });
      if (row?.id) ids.push(Number(row.id));
    } catch (e) {
      console.error('[photos.service] saveUploadedPhotos create failed:', e);
    }
  }
  return ids;
}

export function validateUploadBatch(files: Express.Multer.File[]): { ok: boolean; error?: string } {
  const MAX_FILES = 4;
  const MAX_TOTAL = 10 * 1024 * 1024;
  if (!Array.isArray(files) || files.length === 0) return { ok: false, error: 'No images received' };
  if (files.length > MAX_FILES) return { ok: false, error: `You can upload up to ${MAX_FILES} photos at once` };
  if (totalBytes(files) > MAX_TOTAL) return { ok: false, error: 'Total upload size must be 10MB or less' };
  return { ok: true };
}
