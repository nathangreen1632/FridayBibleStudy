// Client/src/helpers/events.util.ts

/** Convert stored ISO to datetime-local input value (YYYY-MM-DDTHH:mm) */
export function toLocalInputValue(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yr}-${mo}-${da}T${hr}:${mi}`;
  } catch {
    return '';
  }
}
