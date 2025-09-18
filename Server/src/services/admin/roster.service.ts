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
  emailPaused: boolean;
};

export async function listRoster(opts: {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<{ ok: boolean; rows: RosterRow[]; total: number; page: number; pageSize: number; message?: string }> {
  try {
    const page = typeof opts.page === 'number' && opts.page > 0 ? opts.page : 1;
    const pageSize = typeof opts.pageSize === 'number' && opts.pageSize > 0 ? opts.pageSize : 25;

    const SORTABLE: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      addressStreet: 'addressStreet',
      addressCity: 'addressCity',
      addressState: 'addressState',
      addressZip: 'addressZip',
      spouseName: 'spouseName',
    };

    const sortCol = opts.sortBy && Object.hasOwn(SORTABLE, opts.sortBy) ? SORTABLE[opts.sortBy] : 'name';
    const sortDir = opts.sortDir === 'desc' ? 'DESC' : 'ASC';

    const where: Record<string, unknown> = {};
    if (opts.q?.trim()) {
      const s = `%${opts.q.trim()}%`;
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
        'emailPaused',
      ],
      order: [[sortCol, sortDir]],
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
      emailPaused: Boolean(r.get('emailPaused')),
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
    | 'emailPaused'
  >
>;

export async function updateRosterUser(
  userId: number,
  payload: RosterUpdate
): Promise<{ ok: boolean; row?: RosterRow; error?: string }> {
  try {
    const user = await User.findByPk(userId);
    if (!user) return { ok: false, error: 'User not found.' };

    function norm(v: unknown): string | null {
      if (v == null) return null;
      if (typeof v === 'string') {
        const s = v.trim();
        return s === '' ? null : s;
      }
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      return null;
    }

    const next: Record<string, unknown> = {};

    const textKeys: Array<
      'name' | 'email' | 'phone' | 'addressStreet' | 'addressCity' | 'addressState' | 'addressZip' | 'spouseName'
    > = ['name', 'email', 'phone', 'addressStreet', 'addressCity', 'addressState', 'addressZip', 'spouseName'];

    for (const key of textKeys) {
      if (Object.hasOwn(payload, key) && payload[key] !== undefined) {
        (next as any)[key] = norm(payload[key] as unknown);
      }
    }

    if (Object.hasOwn(payload, 'emailPaused') && typeof payload.emailPaused === 'boolean') {
      next.emailPaused = payload.emailPaused;
    }

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
      emailPaused: Boolean(user.get('emailPaused')),
    };
    return { ok: true, row };
  } catch {
    return { ok: false, error: 'Update failed.' };
  }
}

export async function deleteRosterUser(userId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const n = await User.destroy({ where: { id: userId } });
    if (!n) return { ok: false, error: 'User not found.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Unable to delete this user.' };
  }
}
