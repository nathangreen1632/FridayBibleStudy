import path from 'node:path';
import fs from 'node:fs/promises';

const DEFAULT_DEV = path.resolve(process.cwd(), 'uploads');
const DEFAULT_RENDER = '/var/data/fbs-uploads';

export function getUploadRoot(): string {
  const envVal = String(process.env.UPLOAD_ROOT || process.env.UPLOAD_DIR || '').trim();
  if (envVal) return envVal;

  const onRender = process.env.RENDER === 'true' || !!process.env.RENDER_INTERNAL_HOSTNAME;
  if (onRender) return DEFAULT_RENDER;

  return DEFAULT_DEV;
}

export async function ensureDirSafe(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e && (e.code === 'EEXIST' || e.code === 'EISDIR')) return;
    console.error('[uploads] mkdir failed for', dir, err);
  }
}
