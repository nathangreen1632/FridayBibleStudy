// Client/src/types/board.types.ts
import type React from 'react';
import type { ColumnKey } from '../../components/board/dnd/SortableCard.tsx';

export type BoardColumnKey = 'active' | 'archived';
export type DockZoneId = 'dock-archive' | 'dock-praise' | 'dock-active';

// ⬇️ was: (id: number) => React.ReactElement | null
export type RenderCardFn = (
  id: number,
  _column: ColumnKey,
  _index: number
) => React.ReactElement | null;

export type MoveWithinHandler = (id: number, toIndex: number) => Promise<void>;
export type DockDropHandler = (dock: DockZoneId, id: number) => Promise<void>;

// optional convenience re-export if you want it elsewhere
export type { ColumnKey };
