// Server/src/controllers/_dto/prayer.dto.ts
import type { PrayerDTO, AttachmentDTO } from '../../types/socket.types.js';

export function toPrayerDTO(p: any): PrayerDTO {
  const attachments: AttachmentDTO[] | undefined = Array.isArray(p.attachments)
    ? p.attachments.map((a: any) => ({
      id: a.id,
      prayerId: a.prayerId,
      filePath: a.filePath,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: iso(a.createdAt),
    }))
    : undefined;

  return {
    id: p.id,
    groupId: p.groupId,
    authorUserId: p.authorUserId,
    title: p.title,
    content: p.content,
    category: p.category,
    status: p.status,
    position: p.position,
    impersonatedByAdminId: p.impersonatedByAdminId ?? null,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
    author: p.author ? { id: p.author.id, name: p.author.name } : undefined,
    attachments,
  };
}

function iso(d: unknown): string {
  if (!d) return new Date().toISOString();
  if (typeof d === 'string') return d;
  // Sequelize Date objects, dayjs, etc.
  // @ts-expect-error tolerate
  return d.toISOString?.() ?? String(d);
}
