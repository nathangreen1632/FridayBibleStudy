// Server/src/services/admin/bootstrap.service.ts
import { User } from '../../models/index.js';
import { env } from '../../config/env.config.js';

export async function anyAdminExists(): Promise<boolean> {
  try {
    const count = await User.count({ where: { role: 'admin' } });
    return count > 0;
  } catch {
    return true; // safe default: if DB check fails, do not allow bootstrap
  }
}

/** True if the email appears in ADMIN_EMAILS (comma-separated). */
export function isBootstrapEmail(email: string): boolean {
  const raw = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!raw.length) return false;
  return raw.includes(email.toLowerCase());
}
