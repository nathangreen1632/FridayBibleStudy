// Client/src/components/board/Column.board.tsx
import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard, { type ColumnKey } from './SortableCard.board';

interface ColumnProps {
  title: string;
  column: ColumnKey;
  ids: number[];
  renderCard: (id: number, column: ColumnKey, index: number) => React.ReactNode;
}

export default function Column({
                                 title,
                                 column,
                                 ids,
                                 renderCard,
                               }: Readonly<ColumnProps>): React.ReactElement {
  // Stable droppable id used elsewhere for fallback resolution
  const droppableId = useMemo(
    () => (column === 'active' ? 'col-active' : 'col-archived'),
    [column],
  );

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'column', column } as const,
  });

  return (
    <section
      ref={setNodeRef}
      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"
      aria-label={`${title} column`}
      data-column={column}
      data-droppable-id={droppableId}
      data-count={ids.length}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs opacity-70">{ids.length}</span>
      </header>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          className={
            'space-y-3 min-h-[80px] transition-colors ' +
            (isOver ? 'bg-[var(--theme-card-hover)] rounded-xl p-2' : '')
          }
        >
          {ids.map((id, index) => {
            try {
              const child = renderCard(id, column, index);
              return (
                <SortableCard key={id} id={id} index={index} column={column}>
                  {child}
                </SortableCard>
              );
            } catch {

              return (
                <div
                  key={`err-${String(id)}-${index}`}
                  className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3"
                  data-error-card
                >
                  <div className="text-xs opacity-70">
                    Failed to render card #{String(id)} in <em>{column}</em>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </SortableContext>
    </section>
  );
}
