// Client/src/helpers/error.helper.ts
export function humanizeError(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const maybe = value as { message?: unknown };
    if (typeof maybe.message === 'string') return maybe.message;
    try {
      return JSON.stringify(value);
    } catch {
      // ignore
    }
  }
  return fallback;
}
