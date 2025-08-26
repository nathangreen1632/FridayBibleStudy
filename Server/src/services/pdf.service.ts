import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import type { Prayer, Attachment } from '../models/index.js';

export async function buildPrayersPdf(
  data: Array<{ prayer: Prayer & { author?: { name: string } }, attachments: Attachment[] }>
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const item of data) {
    const page = pdf.addPage([612, 792]); // Letter
    const { width } = page.getSize();
    const margin = 48;
    let y = 744;

    const draw = (text: string, size = 12) => {
      page.drawText(text, { x: margin, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 6;
    };

    draw(`Title: ${item.prayer.title}`, 16);
    draw(`Author: ${item.prayer.author?.name ?? 'Unknown'}`);
    draw(`Category: ${item.prayer.category} — Status: ${item.prayer.status}`);
    draw(`Created: ${new Date(item.prayer.createdAt).toLocaleString()}`);
    y -= 6;
    draw('Content:');
    for (const line of wrap(item.prayer.content, 90)) draw(line, 11);

    if (item.attachments.length) {
      y -= 8;
      draw('Photos:');
      let x = margin;

      for (const att of item.attachments) {
        if (y < 200) {
          const next = pdf.addPage([612, 792]);
          y = 744;
          x = margin;
          next.drawText('Photos (cont.)', { x: margin, y, size: 12, font });
          y -= 18;
        }
        const filePath = path.resolve(att.filePath);
        try {
          const buf = await fs.readFile(filePath);
          const mt = att.mimeType.toLowerCase();
          if (mt.includes('png')) {
            const img = await pdf.embedPng(buf);
            const scaled = img.scale(120 / img.width);
            page.drawImage(img, { x, y: y - scaled.height, width: scaled.width, height: scaled.height });
            x += scaled.width + 8;
          } else if (mt.includes('jpeg') || mt.includes('jpg')) {
            const img = await pdf.embedJpg(buf);
            const scaled = img.scale(120 / img.width);
            page.drawImage(img, { x, y: y - scaled.height, width: scaled.width, height: scaled.height });
            x += scaled.width + 8;
          } else {
            draw(`(Skipped ${att.fileName})`, 10);
          }
        } catch {
          draw(`(Missing file: ${att.fileName})`, 10);
        }
      }
      y -= 140;
    }
  }

  return Buffer.from(await pdf.save());
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}
