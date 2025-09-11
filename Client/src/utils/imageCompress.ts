export type CompressOpts = {
  maxWidth?: number;      // e.g., 1600
  maxHeight?: number;     // e.g., 1600
  quality?: number;       // 0..1 e.g., 0.82
  output?: 'image/jpeg' | 'image/webp'; // pick one, jpeg is widely compatible
};

function readAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // fallback path; we'll handle naturalWidth === 0
    img.decoding = 'async';
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Compress a single image. Returns a smaller File or the original on failure. */
export async function compressImage(file: File, opts?: CompressOpts): Promise<File> {
  // Only attempt for images
  if (!file.type.startsWith('image/')) return file;

  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82, output = 'image/jpeg' } = opts || {};

  const img = await readAsImage(file);
  if (!img.naturalWidth || !img.naturalHeight) return file; // unreadable → keep original

  // Compute target size preserving aspect
  let { naturalWidth: w, naturalHeight: h } = img;
  let targetW = w;
  let targetH = h;

  if (w > maxWidth || h > maxHeight) {
    const ratio = Math.min(maxWidth / w, maxHeight / h);
    targetW = Math.max(1, Math.floor(w * ratio));
    targetH = Math.max(1, Math.floor(h * ratio));
  }

  // If no downscale and original is already small, optionally just recompress
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Convert to Blob (JPEG/WebP)
  const blob = await canvasToBlob(canvas, output, quality);
  if (!blob) return file;

  // If recompressed is somehow larger, keep original
  if (blob.size >= file.size) return file;

  const ext = output === 'image/webp' ? 'webp' : 'jpg';
  const name = file.name.replace(/\.(\w+)$/, `.${ext}`);
  return new File([blob], name, { type: output, lastModified: Date.now() });
}
