// Client/src/components/board/SingleBoard.board.tsx
import React from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core';
import Column from './Column.board';
import Dock from './Dock.board'; // ← added
import type { ColumnKey } from './SortableCard.board';

type SingleBoardProps = {
  title: string;
  column: ColumnKey;
  ids: number[];
  renderCard: (id: number, column: ColumnKey, index: number) => React.ReactNode;
  onMoveWithin?: (id: number, toIndex: number) => void; // reorder within same column
  onDockDrop?: (dockId: 'dock-active'|'dock-archive'|'dock-praise', id: number) => void;
};

export default function SingleBoard({
                                      title,
                                      column,
                                      ids,
                                      renderCard,
                                      onMoveWithin,
                                      onDockDrop,
                                    }: Readonly<SingleBoardProps>): React.ReactElement {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const idNum = Number(e.active?.id);
    const overId = e.over?.id;

    if (!Number.isFinite(idNum)) return;
    if (overId == null) return;

    // Dock drop?
    if (typeof overId === 'string' && overId.startsWith('dock-')) {
      if (onDockDrop) {
        onDockDrop(overId as 'dock-active' | 'dock-archive' | 'dock-praise', idNum);
      }
      return;
    }

    // Reorder within this column (overId will be a number-like id of the target card)
    const toIndex = ids.indexOf(Number(overId));
    if (toIndex >= 0 && onMoveWithin) onMoveWithin(idNum, toIndex);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="mx-auto max-w-3xl px-3 sm:px-4 md:px-0">
        <Column title={title} column={column} ids={ids} renderCard={renderCard} />
      </div>

      {/* Dock must live inside the same DndContext so its droppables register */}
      <Dock />
    </DndContext>
  );
}
