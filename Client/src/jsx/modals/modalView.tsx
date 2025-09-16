import React from 'react';
import type { ModalProps } from '../../types/ui/modal.types.ts';

export default function ModalView({
                                    open,
                                    title,
                                    children,
                                    footer,
                                  }: ModalProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="text"
      aria-label={title ?? 'Dialog'}
    >
      <div className="w-full max-w-xl mx-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-accent)] shadow-[0_10px_28px_0_var(--theme-shadow)]">
        {title ? (
          <div className="px-5 py-4 border-b border-[var(--theme-border)]">
            <h3 className="text-center text-lg sm:text-xl font-semibold text-[var(--theme-surface)]">
              {title}
            </h3>
          </div>
        ) : null}

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
