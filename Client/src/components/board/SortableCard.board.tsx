import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ColumnKey = 'active' | 'archived';

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'card',
      index,
      column,
    } as const,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
