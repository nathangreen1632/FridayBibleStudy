import type { Request, Response } from 'express';
import { Prayer, Attachment, Group, User } from '../models/index.js';
import { buildPrayersPdf } from '../services/pdf.service.js';
import { sendEmail } from '../services/email.service.js';

export async function exportFilteredToGroup(req: Request, res: Response): Promise<void> {
  const status = req.query.status as string | undefined;
  const category = req.query.category as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const prayers = await Prayer.findAll({
    where,
    include: [{ model: User, as: 'author', attributes: ['name'] }]
  });

  const attachmentsByPrayer = await Attachment.findAll({ where: { prayerId: prayers.map(p => p.id) } });

  const data = prayers.map((p) => ({
    prayer: p,
    attachments: attachmentsByPrayer.filter(a => a.prayerId === p.id)
  }));

  const pdf = await buildPrayersPdf(data);

  const group = await Group.findOne();
  const to = group?.groupEmail ?? '';

  await sendEmail({
    to,
    subject: 'Friday Bible Study — Prayers Export',
    html: `<p>Attached is the exported prayers list.</p>`,
    attachments: [{ filename: 'prayers.pdf', content: pdf }]
  });

  res.json({ ok: true });
}
