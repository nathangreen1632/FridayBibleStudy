import React from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Column from './Column.board';
import type { ColumnKey } from './SortableCard.board';

export interface BoardProps {
  activeIds: number[];
  archivedIds: number[];
  renderCard: (id: number, column: ColumnKey, index: number) => React.ReactNode;
  onMove: (id: number, toStatus: ColumnKey, newIndex: number) => void;
}

interface DndData {
  type?: 'card' | 'column';
  index?: number;
  column?: ColumnKey;
}

export default function Board({
                                activeIds,
                                archivedIds,
                                renderCard,
                                onMove,
                              }: Readonly<BoardProps>): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function getDropIndex(evt: DragEndEvent | DragOverEvent, toColumn: ColumnKey): number {
    // If dropped over an item, use that item's index; else append to end of that column.
    const overData = (evt.over?.data?.current || {}) as DndData;
    if (overData.type === 'card' && typeof overData.index === 'number') {
      return overData.index;
    }
    return toColumn === 'active' ? activeIds.length : archivedIds.length;
  }

  function handleDragEnd(evt: DragEndEvent) {
    const activeId = Number(evt.active.id);
    const activeData = (evt.active.data.current || {}) as DndData;

    if (!evt.over) return;

    // Drop over column?
    const overData = (evt.over.data.current || {}) as DndData;
    if (overData.type === 'column') {
      const toCol = overData.column!;
      const index = getDropIndex(evt, toCol);
      onMove(activeId, toCol, index);
      return;
    }

    // Drop over card
    const toIndex = getDropIndex(evt, activeData.column!);
    const overColumn =
      (evt.over.data.current as DndData)?.column ?? activeData.column;

    onMove(activeId, overColumn as ColumnKey, toIndex);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full min-h-[86vh] grid grid-cols-1 md:grid-cols-2 gap-6">
        <Column
          title="Active Praises"
          column="active"
          ids={activeIds}
          renderCard={renderCard}
        />
        <Column
          title="Archived Praises"
          column="archived"
          ids={archivedIds}
          renderCard={renderCard}
        />
      </div>
    </DndContext>
  );
}
