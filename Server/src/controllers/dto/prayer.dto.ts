import type { PrayerDTO, AttachmentDTO } from '../../types/socket.types.js';

export function toPrayerDTO(p: any): PrayerDTO {
  const attachments: AttachmentDTO[] | undefined = Array.isArray(p?.attachments)
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

  const position =
    typeof p?.position === 'number'
      ? p.position
      : Number(p?.position ?? 0) || 0;

  return {
    id: p.id,
    groupId: p.groupId,
    authorUserId: p.authorUserId,
    title: p.title,
    content: p.content,
    category: p.category,
    status: p.status,
    position,
    impersonatedByAdminId: p?.impersonatedByAdminId ?? null,
    createdAt: iso(p?.createdAt),
    updatedAt: iso(p?.updatedAt),
    author: p?.author ? { id: p.author.id, name: p.author.name } : undefined,
    attachments,
  };
}

function iso(d: unknown): string {
  if (d == null) return now();

  if (isString(d)) return d;

  if (isValidDate(d)) return (d).toISOString();

  const fromIsoMethod = tryIsoMethod(d);
  if (fromIsoMethod) return fromIsoMethod;

  if (isEpochNumber(d)) return fromEpoch(d);

  const fromCustomToString = tryCustomToString(d);
  if (fromCustomToString) return fromCustomToString;

  return now();
}

function now(): string {
  return new Date().toISOString();
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isValidDate(v: unknown): v is Date {
  return v instanceof Date && Number.isFinite(v.getTime());
}

function tryIsoMethod(v: unknown): string | null {
  const fn = (v as any)?.toISOString;
  if (typeof fn === 'function') {
    try {
      const out = fn.call(v);
      return typeof out === 'string' && out ? out : null;
    } catch {
      return null;
    }
  }
  return null;
}

function isEpochNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function fromEpoch(num: number): string {
  const dt = new Date(num);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : now();
}

function tryCustomToString(v: unknown): string | null {
  const s = (v as any)?.toString?.();
  if (typeof s === 'string' && s && s !== '[object Object]') {
    return s;
  }
  return null;
}
