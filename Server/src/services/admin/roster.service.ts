// Server/src/services/admin/roster.service.ts
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
      // cast to satisfy TS on symbol keys
      (where as any)[Op.or] = [
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
      attributes: [
        'id',
        'name',
        'email',
        'phone',
        'addressStreet',
        'addressCity',
        'addressState',
        'addressZip',
        'spouseName',
      ],
      order: [['name', 'ASC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const mapped: RosterRow[] = rows.map((r) => ({
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

type RosterUpdate = Partial<
  Pick<
    RosterRow,
    | 'name'
    | 'email'
    | 'phone'
    | 'addressStreet'
    | 'addressCity'
    | 'addressState'
    | 'addressZip'
    | 'spouseName'
  >
>;

/** PATCH user fields (admin) with trimming/nulling and simple email uniqueness check */
export async function updateRosterUser(
  userId: number,
  payload: RosterUpdate
): Promise<{ ok: boolean; row?: RosterRow; error?: string }> {
  try {
    const user = await User.findByPk(userId);
    if (!user) return { ok: false, error: 'User not found.' };

    function norm(v: unknown): string | null {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (s === '') return null;
      return s;
    }

    const next: Record<string, unknown> = {};
    if ('name' in payload) next.name = norm(payload.name);
    if ('email' in payload) next.email = norm(payload.email);
    if ('phone' in payload) next.phone = norm(payload.phone);
    if ('addressStreet' in payload) next.addressStreet = norm(payload.addressStreet);
    if ('addressCity' in payload) next.addressCity = norm(payload.addressCity);
    if ('addressState' in payload) next.addressState = norm(payload.addressState);
    if ('addressZip' in payload) next.addressZip = norm(payload.addressZip);
    if ('spouseName' in payload) next.spouseName = norm(payload.spouseName);

    // Email uniqueness (ignore this user)
    if (typeof next.email === 'string' && next.email.includes('@')) {
      const dupe = await User.findOne({
        where: { email: next.email, id: { [Op.ne]: userId } },
        attributes: ['id'],
      });
      if (dupe) return { ok: false, error: 'Email already in use by another account.' };
    }

    await user.update(next);

    const row: RosterRow = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      addressStreet: user.addressStreet ?? null,
      addressCity: user.addressCity ?? null,
      addressState: user.addressState ?? null,
      addressZip: user.addressZip ?? null,
      spouseName: user.spouseName ?? null,
    };
    return { ok: true, row };
  } catch {
    return { ok: false, error: 'Update failed.' };
  }
}

/** DELETE user (admin). If FK constraints prevent it, return a friendly error. */
export async function deleteRosterUser(userId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const n = await User.destroy({ where: { id: userId } });
    if (!n) return { ok: false, error: 'User not found.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Unable to delete this user.' };
  }
}
