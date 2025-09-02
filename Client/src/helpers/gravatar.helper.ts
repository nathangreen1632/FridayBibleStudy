// Client/src/helpers/gravatar.helper.ts
import md5 from 'blueimp-md5';

export function getGravatarUrl(email?: string | null, size: number = 96): string {
  try {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!normalized) return '';
    const hash = md5(normalized);
    // d=identicon gives you a nice default; r=g is the usual safe rating.
    return `https://www.gravatar.com/avatar/${hash}?s=${encodeURIComponent(String(size))}&d=identicon&r=g`;
  } catch {
    return '';
  }
}

export function getInitials(name?: string | null): string {
  try {
    const n = (name ?? '').trim();
    if (!n) return 'U';
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = (parts.length > 1 ? parts[parts.length - 1][0] : '') ?? '';
    return (a + b || a || 'U').toUpperCase();
  } catch {
    return 'U';
  }
}
