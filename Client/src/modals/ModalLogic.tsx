// Client/src/modals/Modal.tsx

import React, { useEffect, useRef } from 'react';
import {useScrollLock} from "../hooks/useScrollLock.ts";

type ModalProps = {
  open: boolean;
  /** Called when user tries to close (e.g., ESC). Parent decides whether to proceed. */
  onRequestClose?: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Notes:
 * - No backdrop click-to-close (safer for older audience; avoids accidental loss).
 * - ESC triggers onRequestClose() so the parent can confirm if there are unsaved changes.
 */
export default function Modal({
                                open,
                                onRequestClose,
                                title,
                                children,
                                footer
                              }: Readonly<ModalProps>): React.ReactElement | null {

  useScrollLock(open);

  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onRequestClose) {
        onRequestClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onRequestClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      /* intentionally no onMouseDown to prevent click-away closes */
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="text"
      aria-label={title ?? 'Dialog'}
    >
      <div className="w-full max-w-xl mx-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-accent)] shadow-[0_10px_28px_0_var(--theme-shadow)]">
        {title && (
          <div className="px-5 py-4 border-b border-[var(--theme-border)]">
            <h3 className="text-center text-lg sm:text-xl font-semibold text-[var(--theme-surface)]">
              {title}
            </h3>
          </div>
        )}

        <div className="px-5 py-4 max-h-[70vh] text-[var(--theme-surface)] overflow-auto custom-scrollbar">
          {children}
        </div>

        <div className="px-5 py-4 border-t border-[var(--theme-border)] flex items-center justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
