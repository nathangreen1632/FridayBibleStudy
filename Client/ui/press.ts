/**
 * Reusable tactile press classes for Tailwind.
 * - pressFx: base transform/animation for any pressable element
 * - pressBtn(): adds focus rings + shadow behavior (ideal for <button>)
 * - pressable(): just the transform (use on non-button clickables)
 */

export const pressFx =
  'motion-safe:transition-transform motion-safe:duration-150 active:translate-y-[1px] active:scale-[.98]';

const pressRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-surface)]';

export function pressBtn(extra?: string): string {
  // shadow change on press + focus ring
  return [extra, pressFx, 'shadow-sm active:shadow-none', pressRing]
    .filter(Boolean)
    .join(' ');
}

export function pressable(extra?: string): string {
  // just the transform (no shadow/ring). Great for image thumbnails, etc.
  return [extra, pressFx].filter(Boolean).join(' ');
}
