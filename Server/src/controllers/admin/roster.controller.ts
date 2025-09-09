import type { Request, Response } from 'express';
import { listRoster } from '../../services/admin/roster.service.js';

export async function getAdminRoster(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
  const pageSize = typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined;

  const result = await listRoster({ q, page, pageSize });
  if (!result.ok) {
    res.status(500).json({ ok: false, message: result.message ?? 'Failed to load roster.' });
    return;
  }
  res.json(result);
}
