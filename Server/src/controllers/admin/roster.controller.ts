import type { Request, Response } from 'express';
import { listRoster, updateRosterUser, deleteRosterUser } from '../../services/admin/roster.service.js';

export async function getAdminRoster(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
  const pageSize = typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined;

  const result = await listRoster({ q, page, pageSize });
  if (!result.ok) { res.status(500).json(result);
    return;
  }

  res.json(result);
}

export async function patchAdminRosterUser(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) { res.status(400).json({ ok: false, error: 'Invalid user id.' }); return; }

  const allowed = {
    name: req.body?.name,
    email: req.body?.email,
    phone: req.body?.phone,
    addressStreet: req.body?.addressStreet,
    addressCity: req.body?.addressCity,
    addressState: req.body?.addressState,
    addressZip: req.body?.addressZip,
    spouseName: req.body?.spouseName,
  };

  const result = await updateRosterUser(userId, allowed);
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