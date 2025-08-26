import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ColumnKey = 'active' | 'archived';

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
                                       children
                                     }: Readonly<SortableCardProps>): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: { index, column }
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
