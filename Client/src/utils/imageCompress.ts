export type CompressOpts = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  output?: 'image/jpeg' | 'image/webp';
};

function readAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.decoding = 'async';
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function compressImage(file: File, opts?: CompressOpts): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82, output = 'image/jpeg' } = opts || {};

  const img = await readAsImage(file);
  if (!img.naturalWidth || !img.naturalHeight) return file;

  let { naturalWidth: w, naturalHeight: h } = img;
  let targetW = w;
  let targetH = h;

  if (w > maxWidth || h > maxHeight) {
    const ratio = Math.min(maxWidth / w, maxHeight / h);
    targetW = Math.max(1, Math.floor(w * ratio));
    targetH = Math.max(1, Math.floor(h * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await canvasToBlob(canvas, output, quality);
  if (!blob) return file;

  if (blob.size >= file.size) return file;

  const ext = output === 'image/webp' ? 'webp' : 'jpg';
  const name = file.name.replace(/\.(\w+)$/, `.${ext}`);
  return new File([blob], name, { type: output, lastModified: Date.now() });
}
