// Client/src/hooks/useOutsideCollapse.ts
import React, { useEffect } from 'react';

/**
 * Collapses (calls onClose) when a pointerdown occurs outside the referenced element.
 *
 * @param ref     React ref to the root container you want to monitor
 * @param open    Whether the container is currently open/expanded
 * @param onClose Callback to close/collapse the container
 */
export function useOutsideCollapse<T extends HTMLElement>(
  ref: React.RefObject<T | null>,   // ✅ allow null
  open: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;

    const handler = (ev: Event) => {
      const root = ref.current;
      const target = ev.target as Node | null;
      if (!root || !target) return;
      if (!root.contains(target)) onClose();
    };

    // capture ensures we run before other handlers; passive avoids blocking scrolling
    document.addEventListener('pointerdown', handler, { capture: true, passive: true });

    return () => {
      document.removeEventListener(
        'pointerdown',
        handler,
        { capture: true } as AddEventListenerOptions
      );
    };
  }, [open, ref, onClose]);
}
