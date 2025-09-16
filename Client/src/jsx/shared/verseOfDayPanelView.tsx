import React from 'react';
import type { VerseOfDayViewProps } from '../../types/ui/verseOfDay.types.ts';

export default function VerseOfDayPanelView({
                                              html,
                                              refText,
                                              loading,
                                            }: VerseOfDayViewProps): React.ReactElement {
  return (
    <div
      className={[
        'relative mt-4',
        'w-full mx-auto px-3 sm:px-4 md:px-0',
        'max-w-4xl 2xl:max-w-[80rem]',
        'sticky top-4',
        'min-[1440px]:static min-[1440px]:w-auto min-[1440px]:max-w-none min-[1440px]:mx-0 min-[1440px]:px-0',
      ].join(' ')}
    >
      <aside
        aria-label="Verse of the Day"
        className={[
          'w-full rounded-2xl bg-[var(--theme-accent)] text-[var(--theme-verse)]',
          'border border-[var(--theme-border)] shadow-md',
          'px-3 py-3 mb-6',
          'min-[1440px]:fixed min-[1440px]:left-4 min-[1440px]:top-1/2 min-[1440px]:-translate-y-1/2',
          'min-[1440px]:inset-x-auto min-[1440px]:bottom-auto',
          'min-[1440px]:px-4 min-[1440px]:py-4 min-[1440px]:w-64',
          'min-[1440px]:max-h-[70vh] min-[1440px]:overflow-auto custom-scrollbar',
          'text-[var(--theme-text)]',
        ].join(' ')}
      >
        <div className="font-semibold mb-2">Verse of the Day</div>
        {loading ? <div>Loading…</div> : null}
        {!loading && !html ? <div>Unavailable.</div> : null}
        {html ? (
          <>
            {refText ? (
              <div className="text-sm mb-2 opacity-80 select-none">{refText}</div>
            ) : null}
            <div className="scripture-styles">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
