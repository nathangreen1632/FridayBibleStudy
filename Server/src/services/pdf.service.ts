import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { Prayer, Attachment } from '../models/index.js';
import {
  addLetterPage,
  drawLine,
  drawSpacer,
  wrapText,
  drawAttachments,
  type DrawContext,
} from '../helpers/pdf.helper.js';

export async function buildPrayersPdf(
  data: Array<{ prayer: Prayer & { author?: { name: string } }, attachments: Attachment[] }>
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const item of data) {
    let ctx: DrawContext = addLetterPage(pdf, font);

    drawLine(ctx, `Title: ${item.prayer.title}`, 16);
    drawLine(ctx, `Author: ${item.prayer.author?.name ?? 'Unknown'}`);
    drawLine(ctx, `Category: ${item.prayer.category} — Status: ${item.prayer.status}`);
    drawLine(ctx, `Created: ${new Date(item.prayer.createdAt).toLocaleString()}`);
    drawSpacer(ctx, 6);

    drawLine(ctx, 'Content:');
    const content = item.prayer.content ?? '';
    for (const line of wrapText(content, 90)) {
      drawLine(ctx, line, 11);
    }

    if (item.attachments?.length) {
      drawSpacer(ctx, 8);
      drawLine(ctx, 'Photos:');
      ctx = await drawAttachments(pdf, ctx, item.attachments);
    }
  }

  return Buffer.from(await pdf.save());
}
