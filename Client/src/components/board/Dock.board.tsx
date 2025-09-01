// Client/src/components/board/Dock.board.tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';

type ZoneProps = { id: string; label: string };

function Zone({ id, label }: Readonly<ZoneProps>) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <button
      ref={setNodeRef}
      aria-label={label}
      className={[
        'w-full text-center rounded-xl border border-[var(--theme-border)]',
        'px-4 py-3 text-base md:px-5 md:py-4 md:text-lg',
        'bg-[var(--theme-card)]/90 shadow-sm',
        'hover:bg-[var(--theme-card-hover)] transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus)]',
        isOver ? 'ring-2 ring-[var(--theme-focus)]' : '',
      ].join(' ')}
      type="button"
    >
      {label}
    </button>
  );
}

export default function Dock(): React.ReactElement {
  return (
    // Wrapper: sticky float + width cap for mobile/tablet
    <div
      className={[
        'relative mt-8',
        'w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-0',
        'sticky bottom-8',
        'xl:static xl:w-auto xl:max-w-none xl:mx-0 xl:px-0 xl:bottom-auto',
      ].join(' ')}
    >
      <aside
        aria-label="Board actions"
        className={[
          // ORIGINAL mobile-first backdrop, but centered vertically
          'w-full',
          'rounded-2xl bg-[var(--theme-surface)]/80 backdrop-blur',
          'border border-[var(--theme-border)] shadow-md',
          'px-3 py-3',
          'flex items-center justify-center gap-3', // ← center vertically
          // removed: 'pb-[env(safe-area-inset-bottom)]',

          // Desktop rail
          'xl:fixed xl:right-4 xl:top-1/2 xl:-translate-y-1/2',
          'xl:inset-x-auto xl:bottom-auto',
          'xl:flex-col xl:items-stretch xl:gap-4',
          'xl:px-4 xl:py-4',
          'xl:w-64',
        ].join(' ')}
      >
        <Zone id="dock-active" label="Move to Prayers" />
        <Zone id="dock-praise" label="Move to Praises" />
        <Zone id="dock-archive" label="Move to Archive" />
      </aside>
    </div>
  );
}
