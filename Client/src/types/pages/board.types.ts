import type React from 'react';
import type { ColumnKey } from '../../components/board/dnd/SortableCard.tsx';

export type BoardColumnKey = 'active' | 'archived';
export type DockZoneId = 'dock-archive' | 'dock-praise' | 'dock-active';

export type RenderCardFn = (
  id: number,
  _column: ColumnKey,
  _index: number
) => React.ReactElement | null;

export type MoveWithinHandler = (id: number, toIndex: number) => Promise<void>;
export type DockDropHandler = (dock: DockZoneId, id: number) => Promise<void>;

export type { ColumnKey };
