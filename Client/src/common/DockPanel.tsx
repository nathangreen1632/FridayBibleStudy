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
        'w-full min-w-0 text-center rounded-xl border border-[var(--theme-border)]',
        'px-4 py-3 text-base md:px-5 md:py-4 md:text-lg',
        'bg-[var(--theme-card)]/90 shadow-sm',
        'hover:bg-[var(--theme-card-hover)] transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus)]',
        'whitespace-normal leading-snug',
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
    <aside
      aria-label="Board actions"
      className={[
        'hidden',
        'min-[1440px]:fixed min-[1440px]:right-4 min-[1440px]:top-1/2 min-[1440px]:-translate-y-1/2',
        'min-[1440px]:inset-x-auto min-[1440px]:bottom-auto',
        'min-[1440px]:grid min-[1440px]:grid-cols-1 min-[1440px]:gap-4',
        'min-[1440px]:px-4 min-[1440px]:py-4 min-[1440px]:w-64',
        'min-[1440px]:rounded-2xl min-[1440px]:bg-[var(--theme-button)] min-[1440px]:backdrop-blur',
        'min-[1440px]:border min-[1440px]:border-[var(--theme-border)] min-[1440px]:shadow-md',
      ].join(' ')}
    >
      <Zone id="dock-active" label="Move to Prayers" />
      <Zone id="dock-praise" label="Move to Praises" />
      <Zone id="dock-archive" label="Move to Archived" />
    </aside>
  );
}
