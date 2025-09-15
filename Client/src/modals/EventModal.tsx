import React, { useEffect, useRef } from 'react';
import type { EventRow } from '../helpers/api/eventsApi';

type Props = {
  open: boolean;
  event: EventRow | null;
  onClose: () => void;
};

export default function EventModal({
                                     open,
                                     event,
                                     onClose,
                                   }: Readonly<Props>): React.ReactElement | null {
  const shellRef = useRef<HTMLDivElement | null>(null);

  // ESC to close (same pattern as LightboxModal)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasTimes = Boolean(event?.startsAt);
  const startD = hasTimes && event?.startsAt ? new Date(event.startsAt) : null;
  const endD = event?.endsAt ? new Date(event.endsAt) : null;

  return (
    <div
      role="text"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop behaves like your photo lightbox (click to close) */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Modal shell (mirrors LightboxModal container) */}
      <div
        ref={shellRef}
        className="relative max-w-[95vw] max-h-[90vh] p-4 rounded-2xl bg-[var(--theme-accent)] shadow-xl border border-[var(--theme-border)] overflow-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-2xl font-extrabold text-[var(--theme-text-white)]">
            {event?.title || 'Untitled Event'}
          </h2>

          <button
            onClick={onClose}
            className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
          >
            Close
          </button>
        </div>

        {/* Meta */}
        {hasTimes && startD && (
          <div className="mb-1 text-base opacity-80 text-[var(--theme-text-white)]">
            <span className="font-semibold">Date:</span>{' '}
            {startD.toLocaleDateString()}
            {endD && ` – ${endD.toLocaleDateString()}`}
          </div>
        )}

        {hasTimes && startD && (
          <div className="mb-1 text-base opacity-80 text-[var(--theme-text-white)]">
            <span className="font-semibold">Time:</span>{' '}
            {startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {endD &&
              ` – ${endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        )}

        {event?.location && (
          <div className="mb-3 text-base opacity-80 text-[var(--theme-text-white)]">
            <span className="font-semibold">Location:</span> {event.location}
          </div>
        )}

        {/* Body */}
        {event?.content && (
          <div className="whitespace-pre-wrap text-lg leading-relaxed text-[var(--theme-text-white)]">
            {event.content}
          </div>
        )}
      </div>
    </div>
  );
}
