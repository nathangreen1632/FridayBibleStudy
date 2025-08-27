import { rgb, type PDFDocument, type PDFPage, type PDFFont } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import type { Attachment } from '../models/index.js';

export const LETTER_SIZE: [number, number] = [612, 792]; // 8.5x11
const DEFAULT_MARGIN = 48;
const BOTTOM_MARGIN = 48;

export type DrawContext = {
  page: PDFPage;
  y: number;
  margin: number;
  font: PDFFont;
  width: number;
};

/** Create a new Letter page and return a drawing context. Optionally add a small title line. */
export function addLetterPage(pdf: PDFDocument, font: PDFFont, title?: string): DrawContext {
  const page = pdf.addPage(LETTER_SIZE);
  const { width } = page.getSize();
  const margin = DEFAULT_MARGIN;
  let y = LETTER_SIZE[1] - margin;

  if (title) {
    page.drawText(title, { x: margin, y, size: 12, font, color: rgb(0, 0, 0) });
    y -= 18;
  }

  return { page, y, margin, font, width };
}

/** Draw a single line of text and move the cursor down. */
export function drawLine(ctx: DrawContext, text: string, size = 12): void {
  ctx.page.drawText(text, { x: ctx.margin, y: ctx.y, size, font: ctx.font, color: rgb(0, 0, 0) });
  ctx.y -= size + 6;
}

/** Add vertical space. */
export function drawSpacer(ctx: DrawContext, px = 6): void {
  ctx.y -= px;
}

/** Simple character-based wrapper (kept from original, extracted). */
export function wrapText(text: string, widthChars: number): string[] {
  const out: string[] = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > widthChars) {
      if (line) out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

/**
 * Draw a list of image attachments. Handles pagination, rows, and unsupported/missing files.
 * Returns the updated drawing context (with advanced y/page).
 */
export async function drawAttachments(
  pdf: PDFDocument,
  ctx: DrawContext,
  attachments: Attachment[]
): Promise<DrawContext> {
  const targetWidth = 120; // px width for each thumbnail
  const gap = 8;           // gap between thumbnails
  let x = ctx.margin;
  let rowHeight = 0;

  const ensureSpace = (needed: number): void => {
    if (ctx.y - needed < BOTTOM_MARGIN) {
      // New page for images (cont.)
      const next = addLetterPage(pdf, ctx.font, 'Photos (cont.)');
      ctx.page = next.page;
      ctx.y = next.y;
      ctx.margin = next.margin;
      ctx.width = next.width;
      x = ctx.margin;
      rowHeight = 0;
    }
  };

  const newRow = (): void => {
    if (rowHeight > 0) {
      ctx.y -= rowHeight + gap;
      x = ctx.margin;
      rowHeight = 0;
    }
  };

  for (const att of attachments) {
    const filePath = path.resolve(att.filePath);
    try {
      const buf = await fs.readFile(filePath);
      const mime = (att.mimeType || '').toLowerCase();

      if (!isSupportedImageMime(mime)) {
        ensureSpace(18);
        drawLine(ctx, `(Skipped ${att.fileName})`, 10);
        continue;
      }

      const img = await embedImage(pdf, buf, mime);
      const { width: w, height: h } = scaleToWidth(img.width, img.height, targetWidth);

      // Wrap to next row if width overflows
      if (x + w > ctx.width - ctx.margin) {
        newRow();
        ensureSpace(h + 18);
      } else {
        ensureSpace(h + 18);
      }

      ctx.page.drawImage(img.ref, { x, y: ctx.y - h, width: w, height: h });
      x += w + gap;
      rowHeight = Math.max(rowHeight, h);
    } catch {
      ensureSpace(18);
      drawLine(ctx, `(Missing file: ${att.fileName})`, 10);
    }
  }

  // Flush last row spacing
  if (rowHeight > 0) {
    ctx.y -= rowHeight + 20;
  }

  return ctx;
}

/* ------------------------------ image helpers ------------------------------ */

type Embedded = { ref: any; width: number; height: number };

function isSupportedImageMime(mime: string): boolean {
  return mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg');
}

async function embedImage(pdf: PDFDocument, buf: Buffer, mime: string): Promise<Embedded> {
  if (mime.includes('png')) {
    const ref = await pdf.embedPng(buf);
    return { ref, width: ref.width, height: ref.height };
  }
  // jpeg/jpg
  const ref = await pdf.embedJpg(buf);
  return { ref, width: ref.width, height: ref.height };
}

function scaleToWidth(width: number, height: number, targetWidth: number): { width: number; height: number } {
  const scale = targetWidth / width;
  return { width: targetWidth, height: Math.round(height * scale) };
}
