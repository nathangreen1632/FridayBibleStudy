import React from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import Column from './Column.board';

type ColumnKey = 'active' | 'archived';

export interface BoardProps {
  activeIds: number[];
  archivedIds: number[];
  renderCard: (id: number, column: ColumnKey, index: number) => React.ReactNode;
  onMove: (id: number, toStatus: ColumnKey, newIndex: number) => void;
}

interface DndData {
  index?: number;
  column?: ColumnKey;
}

export default function Board({
                                activeIds,
                                archivedIds,
                                renderCard,
                                onMove
                              }: Readonly<BoardProps>): React.ReactElement {
  function handleDragEnd(evt: DragEndEvent) {
    const id = Number(evt.active.id);
    if (!evt.over) return;

    const overData = evt.over.data.current as DndData | undefined;

    // Dropped over a card (we get its column and index)
    if (overData?.column) {
      const toStatus = overData.column;
      const newIndex = overData.index ?? 0;
      onMove(id, toStatus, newIndex);
      return;
    }

    // Dropped over an empty column (use container ids: 'col-active' / 'col-archived')
    if (evt.over.id === 'col-active') {
      onMove(id, 'active', activeIds.length);
      return;
    }
    if (evt.over.id === 'col-archived') {
      onMove(id, 'archived', archivedIds.length);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Column title="Active Praises" column="active" ids={activeIds} renderCard={renderCard} />
        <Column title="Archived Praises" column="archived" ids={archivedIds} renderCard={renderCard} />
      </div>
    </DndContext>
  );
}
