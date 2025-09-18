import React, { useEffect } from 'react';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import type { EventModalProps } from '../types/ui/eventModal.types.ts';
import EventModalView from '../jsx/events/eventModalView.tsx';

export default function EventModalLogic({
                                          open,
                                          event,
                                          onClose,
                                        }: Readonly<EventModalProps>): React.ReactElement | null {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { onClose();

        } catch {

        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <EventModalView
      open={open}
      event={event}
      onClose={onClose}
    />
  );
}
