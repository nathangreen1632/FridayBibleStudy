import { Op } from 'sequelize';
import { User } from '../../models/index.js';

export type RosterRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;
};

export async function listRoster(opts: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ ok: boolean; rows: RosterRow[]; total: number; page: number; pageSize: number; message?: string }> {
  try {
    const page = typeof opts.page === 'number' && opts.page > 0 ? opts.page : 1;
    const pageSize = typeof opts.pageSize === 'number' && opts.pageSize > 0 ? opts.pageSize : 25;
    const where: Record<string, unknown> = {};

    if (opts.q?.trim()) {
      const s = `%${opts.q.trim()}%`;
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: s } },
        { email: { [Op.iLike]: s } },
        { phone: { [Op.iLike]: s } },
        { addressStreet: { [Op.iLike]: s } },
        { addressCity: { [Op.iLike]: s } },
        { addressState: { [Op.iLike]: s } },
        { addressZip: { [Op.iLike]: s } },
        { spouseName: { [Op.iLike]: s } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id','name','email','phone','addressStreet','addressCity','addressState','addressZip','spouseName'],
      order: [['name', 'ASC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const mapped: RosterRow[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone ?? null,
      addressStreet: r.addressStreet ?? null,
      addressCity: r.addressCity ?? null,
      addressState: r.addressState ?? null,
      addressZip: r.addressZip ?? null,
      spouseName: r.spouseName ?? null,
    }));

    return { ok: true, rows: mapped, total: count, page, pageSize };
  } catch {
    return { ok: false, rows: [], total: 0, page: 1, pageSize: 25, message: 'Could not load roster.' };
  }
}
