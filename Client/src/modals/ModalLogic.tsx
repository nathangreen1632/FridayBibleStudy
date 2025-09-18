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
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { onRequestClose?.();

        } catch {

        }
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
