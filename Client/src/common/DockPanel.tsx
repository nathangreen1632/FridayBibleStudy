// Client/src/common/DockPanel.tsx
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
        // ensure each cell fills evenly & text can’t force width differences
        'w-full min-w-0 text-center rounded-xl border border-[var(--theme-border)]',
        'px-4 py-3 text-base md:px-5 md:py-4 md:text-lg',
        'bg-[var(--theme-card)]/90 shadow-sm',
        'hover:bg-[var(--theme-card-hover)] transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus)]',
        'whitespace-normal leading-snug', // allow wrapping without changing width
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
    <div
      className={[
        'relative mt-8',
        'w-full mx-auto px-3 sm:px-4 md:px-0',
        'max-w-4xl 2xl:max-w-[80rem]',
        'sticky bottom-8',
        'min-[1440px]:static min-[1440px]:w-auto min-[1440px]:max-w-none min-[1440px]:mx-0 min-[1440px]:px-0 min-[1440px]:bottom-auto',
      ].join(' ')}
    >
      <aside
        aria-label="Board actions"
        className={[
          'w-full rounded-2xl bg-[var(--theme-surface)]/80 backdrop-blur',
          'border border-[var(--theme-border)] shadow-md',

          // ✅ Mobile/tablet: three equal slots
          'grid grid-cols-3 gap-3 px-3 py-3',

          // 🖥️ Desktop rail (>=1440px): vertical stack
          'min-[1440px]:fixed min-[1440px]:right-4 min-[1440px]:top-1/2 min-[1440px]:-translate-y-1/2',
          'min-[1440px]:inset-x-auto min-[1440px]:bottom-auto',
          'min-[1440px]:grid min-[1440px]:grid-cols-1 min-[1440px]:gap-4',
          'min-[1440px]:px-4 min-[1440px]:py-4 min-[1440px]:w-64',
        ].join(' ')}
      >
        <Zone id="dock-active" label="Move to Prayers" />
        <Zone id="dock-praise" label="Move to Praises" />
        <Zone id="dock-archive" label="Move to Archived" />
      </aside>
    </div>
  );
}
