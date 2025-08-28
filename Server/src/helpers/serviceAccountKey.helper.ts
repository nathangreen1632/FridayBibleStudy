import { promises as fs } from 'fs';
import path from 'path';

function looksLikeJson(s: string): boolean {
  const trimmed = s.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function looksLikeBase64(s: string): boolean {
  // len multiple of 4 and only base64 chars (+/0-9A-Za-z and = padding)
  if (!s || s.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(s);
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.stat(p); return true; } catch { return false; }
}

/**
 * Resolves a path to a JSON credentials file usable by Google SDKs.
 * Strategy:
 * 1) If GOOGLE_APPLICATION_CREDENTIALS already points to a file, fix perms and return it.
 * 2) If SERVICE_ACCOUNT_KEY_PATH exists:
 *    - If its content is JSON, fix perms and return it.
 *    - If its content is base64, decode to JSON (overwrite), fix perms and return it.
 * 3) Else if GOOGLE_CREDENTIALS_B64 is set, decode to SERVICE_ACCOUNT_KEY_PATH and return it.
 * 4) Else: return null (fall back to ADC if available).
 */
export async function ensureServiceAccountKeyFile(
  keyPath: string,
  b64FromEnv?: string
): Promise<string | null> {
  const preSet = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (preSet && await fileExists(preSet)) {
    // Hardening perms (best effort)
    await fs.chmod(preSet, 0o600).catch(() => {});
    return preSet;
  }

  const dir = path.dirname(keyPath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 }).catch(() => {});
  await fs.chmod(dir, 0o700).catch(() => {});

  if (await fileExists(keyPath)) {
    // Detect content type
    const raw = await fs.readFile(keyPath, 'utf8').catch(() => '');
    if (looksLikeJson(raw)) {
      await fs.chmod(keyPath, 0o600).catch(() => {});
      return keyPath;
    }
    if (looksLikeBase64(raw)) {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      await fs.writeFile(keyPath, decoded, { mode: 0o600 });
      await fs.chmod(keyPath, 0o600).catch(() => {});
      return keyPath;
    }
    // If it’s neither JSON nor base64, leave it alone and don’t use it.
    return null;
  }

  if (b64FromEnv && b64FromEnv.trim().length > 0) {
    const decoded = looksLikeBase64(b64FromEnv)
      ? Buffer.from(b64FromEnv, 'base64').toString('utf8')
      : b64FromEnv; // allow direct JSON in env too
    await fs.writeFile(keyPath, decoded, { mode: 0o600 });
    await fs.chmod(keyPath, 0o600).catch(() => {});
    return keyPath;
  }

  // Nothing to use; let Google Auth fallback to ADC if configured
  return null;
}
