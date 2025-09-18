import { User } from '../../models/index.js';
import { env } from '../../config/env.config.js';

export async function anyAdminExists(): Promise<boolean> {
  try {
    const count = await User.count({ where: { role: 'admin' } });
    return count > 0;
  } catch {
    return true;
  }
}

export function isBootstrapEmail(email: string): boolean {
  const raw = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!raw.length) return false;
  return raw.includes(email.toLowerCase());
}
