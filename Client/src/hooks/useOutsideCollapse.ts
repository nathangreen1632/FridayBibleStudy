import React, { useEffect } from 'react';

export function useOutsideCollapse<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
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
