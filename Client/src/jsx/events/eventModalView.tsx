import React from 'react';
import type { EventModalViewProps } from '../../types/ui/eventModal.types.ts';

export default function EventModalView({
                                         open,
                                         event,
                                         onClose,
                                       }: EventModalViewProps): React.ReactElement | null {
  if (!open) return null;

  const hasTimes = Boolean(event?.startsAt);
  const startD = hasTimes && event?.startsAt ? new Date(event.startsAt) : null;
  const endD = event?.endsAt ? new Date(event.endsAt) : null;

  return (
    <div
      role="text"
      aria-modal="true"
      aria-label={event?.title || 'Event details'}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop behaves like your photo lightbox (click to close) */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Modal shell — mobile first */}
      <div
        className={[
          // size (outer sets caps; inner inherits)
          'relative w-[90vw] max-h-[80dvh]',
          'sm:w-[88vw] sm:max-h-[85dvh]',
          'md:max-w-[70vw] md:max-h-[85vh]',
          // visual chrome lives on the OUTER
          'rounded-2xl bg-[var(--theme-accent)] border border-[var(--theme-border)] shadow-xl',
          // hide inner square edges from showing past the radius
          'overflow-hidden',
        ].join(' ')}
      >
        {/* everything below scrolls INSIDE, keeping rounded corners */}
        <div
          className={[
            'h-full max-h-[inherit] overflow-auto custom-scrollbar scrollpad',
            'p-4 sm:p-5',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-2xl font-extrabold text-[var(--theme-text-white)]">
              {event?.title || 'Untitled Event'}
            </h2>

            <button
              onClick={onClose}
              className="absolute top-2 right-2 px-5 mr-2 py-1 rounded-lg bg-[var(--theme-button-hover)] text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
            >
              Close
            </button>
          </div>

          {/* Meta */}
          {hasTimes && startD ? (
            <div className="mb-1 text-base opacity-80 text-[var(--theme-text-white)]">
              <span className="font-semibold">Date:</span>{' '}
              {startD.toLocaleDateString()}
              {endD ? ` – ${endD.toLocaleDateString()}` : ''}
            </div>
          ) : null}

          {hasTimes && startD ? (
            <div className="mb-1 text-base opacity-80 text-[var(--theme-text-white)]">
              <span className="font-semibold">Time:</span>{' '}
              {startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {endD
                ? ` – ${endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </div>
          ) : null}

          {event?.location ? (
            <div className="mb-3 text-base opacity-80 text-[var(--theme-text-white)]">
              <span className="font-semibold">Location:</span> {event.location}
            </div>
          ) : null}

          {event?.content ? (
            <div className="whitespace-pre-wrap text-lg leading-relaxed text-[var(--theme-text-white)]">
              {event.content}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
