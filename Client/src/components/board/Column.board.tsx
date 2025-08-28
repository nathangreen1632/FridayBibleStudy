import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard, {type ColumnKey } from './SortableCard.board';

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
  const droppableId = column === 'active' ? 'col-active' : 'col-archived';
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'column', column } as const,
  });

  return (
    <section
      ref={setNodeRef}
      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"
      aria-label={`${title} column`}
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
