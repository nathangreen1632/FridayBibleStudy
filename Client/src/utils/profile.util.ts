import type { User } from '../types/domain/domain.types.ts';
import type { FormValues } from '../types/pages/profile.types.ts';

export const phoneRE = /^\d{3}-\d{3}-\d{4}$/;

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export function normalizeFromUser(user: User): FormValues {
  const name =
    user.name?.trim().length && user.name.trim().toLowerCase() !== 'user'
      ? user.name
      : '';

  // Casting for optional profile fields that may not exist on User shape
  const anyUser = user as any;

  return {
    name,
    phone: anyUser.phone ?? '',
    addressStreet: anyUser.addressStreet ?? '',
    addressCity: anyUser.addressCity ?? '',
    addressState: anyUser.addressState ?? '',
    addressZip: anyUser.addressZip ?? '',
    spouseName: anyUser.spouseName ?? '',
  };
}
