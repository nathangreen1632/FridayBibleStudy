import React, { useEffect } from 'react';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import type { ModalProps } from '../types/ui/modal.types.ts';
import ModalView from '../jsx/modals/modalView.tsx';

export default function ModalLogic({
                                     open,
                                     onRequestClose,
                                     title,
                                     children,
                                     footer,
                                   }: ModalProps): React.ReactElement | null {
  // Lock body scroll when open (consistent with other modals)
  useScrollLock(open);

  // ESC to request close (parent decides)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { onRequestClose?.(); } catch { /* graceful, no-throw */ }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onRequestClose]);

  if (!open) return null;

  return (
    <ModalView
      open={open}
      onRequestClose={onRequestClose}
      title={title}
      footer={footer}
    >
      {children}
    </ModalView>
  );
}
