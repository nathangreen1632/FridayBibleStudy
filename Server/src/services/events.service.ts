import { Event } from '../models/index.js';
import type { WhereOptions } from 'sequelize';

export async function listEvents(groupId: number): Promise<Event[]> {
  return Event.findAll({
    where: { groupId, status: 'published' },
    order: [['startsAt', 'ASC'], ['createdAt', 'DESC']],
  });
}

export async function listEventsAdmin(opts: { groupId?: number; includeDrafts?: boolean }): Promise<Event[]> {
  const where: WhereOptions = {};
  if (typeof opts.groupId === 'number' && opts.groupId > 0) {
    (where as any).groupId = opts.groupId;
  }
  if (!opts.includeDrafts) {
    (where as any).status = 'published';
  }
  return Event.findAll({
    where,
    order: [['startsAt', 'ASC'], ['createdAt', 'DESC']],
  });
}

export async function createEvent(input: Partial<Event>): Promise<{ ok: boolean; id?: number }> {
  try {
    const row = await Event.create(input as any);
    return { ok: true, id: row.id };
  } catch {
    return { ok: false };
  }
}

export async function updateEvent(id: number, updates: Record<string, unknown>): Promise<boolean> {
  try {
    const row = await Event.findByPk(id);
    if (!row) return false;

    if (typeof updates.title === 'string') row.title = updates.title;
    if (typeof updates.content === 'string') row.content = updates.content;
    if (typeof updates.location === 'string' || updates.location === null) row.location = updates.location as any;
    if (updates.startsAt instanceof Date || updates.startsAt === null) row.startsAt = updates.startsAt as any;
    if (updates.endsAt instanceof Date || updates.endsAt === null) row.endsAt = updates.endsAt as any;
    if (updates.status === 'draft' || updates.status === 'published') row.status = updates.status;

    await row.save();
    return true;
  } catch {
    return false;
  }
}

export async function deleteEventById(id: number): Promise<boolean> {
  try {
    const deleted = await Event.destroy({ where: { id } });
    return deleted > 0;
  } catch {
    return false;
  }
}
