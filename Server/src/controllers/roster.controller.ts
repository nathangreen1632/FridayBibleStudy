import type { Request, Response } from 'express';
import { listRoster } from '../services/admin/roster.service.js';

/**
 * Friend/Admin shared read-only roster list.
 * Admin-only mutations stay under /api/admin/roster.
 */
export async function getRoster(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
  const pageSize = typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined;

  let sortBy: string | undefined;
  if (typeof req.query.sortBy === 'string') sortBy = req.query.sortBy;

  let sortDir: 'asc' | 'desc' | undefined;
  const rawDir = typeof req.query.sortDir === 'string' ? req.query.sortDir.toLowerCase() : undefined;
  if (rawDir === 'asc' || rawDir === 'desc') sortDir = rawDir;

  const result = await listRoster({ q, page, pageSize, sortBy, sortDir });
  if (!result.ok) {
    res.status(500).json(result);
    return;
  }

  // Keep response shape simple for client
  res.json({
    ok: true,
    data: result.rows,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}
