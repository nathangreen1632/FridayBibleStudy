import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from './SortableCard.board';

type ColumnKey = 'active' | 'archived';

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
                                 renderCard
                               }: Readonly<ColumnProps>): React.ReactElement {
  const { setNodeRef } = useDroppable({
    id: `col-${column}`,          // identify this container
    data: { column }              // helps dragEnd know the destination
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${title} column`}
      className="flex-1 min-w-[320px] rounded-2xl bg-[var(--theme-surface,#111)] p-4"
    >
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
      </header>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {ids.map((id, index) => (
            <SortableCard key={id} id={id} index={index} column={column}>
              {renderCard(id, column, index)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
