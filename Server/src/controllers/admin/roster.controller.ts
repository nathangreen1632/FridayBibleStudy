import type { Request, Response } from 'express';
import { listRoster, updateRosterUser, deleteRosterUser } from '../../services/admin/roster.service.js';

export async function getAdminRoster(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
  const pageSize = typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined;

  // ✅ NEW: parse sort params (leave validation to service)
  let sortBy: string | undefined;
  if (typeof req.query.sortBy === 'string') {
    sortBy = req.query.sortBy;
  }

  let rawDir: string | undefined;
  if (typeof req.query.sortDir === 'string') {
    rawDir = req.query.sortDir.toLowerCase();
  }

  let sortDir: 'asc' | 'desc' | undefined;
  if (rawDir === 'desc') {
    sortDir = 'desc';
  } else if (rawDir === 'asc') {
    sortDir = 'asc';
  }


  const result = await listRoster({ q, page, pageSize, sortBy, sortDir });
  if (!result.ok) {
    res.status(500).json(result);
    return;
  }
  res.json(result);
}

export async function patchAdminRosterUser(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) { res.status(400).json({ ok: false, error: 'Invalid user id.' }); return; }

  // Start with all possible fields…
  const allowed: Record<string, unknown> = {
    name: req.body?.name,
    email: req.body?.email,
    phone: req.body?.phone,
    addressStreet: req.body?.addressStreet,
    addressCity: req.body?.addressCity,
    addressState: req.body?.addressState,
    addressZip: req.body?.addressZip,
    spouseName: req.body?.spouseName,
    emailPaused: req.body?.emailPaused as boolean | undefined,
  };

  // …then drop any that are undefined so we don't null-out required fields.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(allowed)) {
    if (v !== undefined) clean[k] = v;
  }

  const result = await updateRosterUser(userId, clean);
  if (!result.ok) { res.status(400).json(result); return; }
  res.json(result);
}


export async function deleteAdminRosterUser(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) { res.status(400).json({ ok: false, error: 'Invalid user id.' }); return; }

  const result = await deleteRosterUser(userId);
  if (!result.ok) { res.status(400).json(result); return; }
  res.json(result);
}
