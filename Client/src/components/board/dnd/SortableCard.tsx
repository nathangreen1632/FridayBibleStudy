// Client/src/components/board/SortableCard.board.tsx
import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ColumnKey = 'active' | 'praise' | 'archived';

interface SortableCardProps {
  id: number;
  index: number;
  column: ColumnKey;
  children: React.ReactNode;
}

export default function SortableCard({
                                       id,
                                       index,
                                       column,
                                       children,
                                     }: Readonly<SortableCardProps>): React.ReactElement {
  const safeId = Number.isFinite(id) ? id : Number(id);
  const safeIndex = Number.isFinite(index) ? index : 0;

  const sortable = useSortable({
    id: safeId,
    data: { type: 'card', index: safeIndex, column } as const,
  });

  const {
    attributes = {},
    listeners = {},
    setNodeRef,
    transform,
    transition,
    isDragging = false,
  } = sortable ?? ({} as ReturnType<typeof useSortable>);

  const style: React.CSSProperties = useMemo(() => {
    try {
      return {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        cursor: 'grab',
        zIndex: isDragging ? 50 : undefined,
        userSelect: isDragging ? 'none' : undefined,
        touchAction: 'none',
      };
    } catch {
      return {
        opacity: isDragging ? 0.6 : 1,
        cursor: 'grab',
      };
    }
  }, [transform, transition, isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
