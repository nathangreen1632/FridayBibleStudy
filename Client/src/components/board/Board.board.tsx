// Client/src/components/board/Board.board.tsx
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
  onMove: (id: number, toStatus: ColumnKey, newIndex: number) => void | Promise<void>;
}

interface DndData {
  type?: 'card' | 'column';
  index?: number;
  column?: ColumnKey;
}

function resolveColumnFromDroppableId(id: string | number | symbol | undefined): ColumnKey | undefined {
  if (typeof id !== 'string') return undefined;
  if (id === 'col-active') return 'active';
  if (id === 'col-archived') return 'archived';
  return undefined;
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

  // replace just this function
  function resolveColumnByPointer(evt: DragEndEvent | DragOverEvent): ColumnKey | undefined {
    try {
      const rect =
        evt.active?.rect?.current?.translated ??
        evt.active?.rect?.current?.initial;
      if (!rect) return undefined;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const elActive = document.querySelector<HTMLElement>('[data-column="active"]');
      const elArchived = document.querySelector<HTMLElement>('[data-column="archived"]');

      const inside = (el?: Element | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      };

      if (inside(elArchived)) return 'archived';
      if (inside(elActive)) return 'active';
    } catch {
      // fall through safely
    }
    return undefined;
  }

  function getDropIndex(evt: DragEndEvent | DragOverEvent, toColumn: ColumnKey): number {
    try {
      const overData = (evt.over?.data?.current || {}) as DndData;
      if (overData.type === 'card' && typeof overData.index === 'number') {
        return overData.index;
      }
    } catch {
      // ignore and append below
    }
    return toColumn === 'active' ? activeIds.length : archivedIds.length;
  }

  async function handleDragEnd(evt: DragEndEvent) {
    try {
      const activeId = Number(evt.active?.id);
      if (!Number.isFinite(activeId)) return;
      if (!evt.over) return;

      const activeData = (evt.active?.data?.current || {}) as DndData;
      const overData = (evt.over.data.current || {}) as DndData;

      // 1) Dropped over a COLUMN
      if (overData.type === 'column') {
        const toCol = overData.column ?? resolveColumnFromDroppableId(String(evt.over.id));
        if (!toCol) return;
        const index = getDropIndex(evt, toCol);
        await safeOnMove(onMove, activeId, toCol, index);
        return;
      }

      // 2) Dropped over a CARD
      let overColumn: ColumnKey | undefined =
        overData.column ??
        activeData.column ??
        resolveColumnFromDroppableId(String(evt.over.id));

      // Override via pointer hit-test when dnd-kit misidentifies target
      const pointerCol = resolveColumnByPointer(evt);
      if (pointerCol && pointerCol !== overColumn) {
        overColumn = pointerCol;
      }

      if (overColumn !== 'active' && overColumn !== 'archived') return;

      const toIndex = getDropIndex(evt, overColumn);
      await safeOnMove(onMove, activeId, overColumn, toIndex);
    } catch {
      // swallow to keep UI responsive
    }
  }

  function isPromise<T>(value: unknown): value is Promise<T> {
    return !!value && typeof (value as Promise<T>).then === 'function';
  }

  async function safeOnMove(
    onMoveFn: BoardProps['onMove'],
    id: number,
    to: ColumnKey,
    idx: number
  ): Promise<void> {
    try {
      const result = onMoveFn?.(id, to, idx);
      if (isPromise(result)) {
        await result;
      }
    } catch {
      // no throws; fail silently per project guideline
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div
        className="
          w-full min-h-[86vh]
          mx-auto max-w-5xl
          grid grid-cols-1 md:grid-cols-2
          gap-3 sm:gap-4 md:gap-6
          px-3 sm:px-4 md:px-0
        "
      >
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
