import React from 'react';
import SingleBoard from '../../components/board/SingleColumnBoard';
import { useBoardStore } from '../../stores/useBoardStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import type { ColumnKey } from '../../components/SortableCard';
import {
  useBoardBootstrap,
  useJoinGroup,
  useMoveToPraise,
  usePrayerCardRenderer,
  useOnMove,
} from '../../helpers/boardPage.helper';

// Only the two board columns are valid for in-column moves
type BoardColumnKey = 'active' | 'archived';

export default function ActiveBoard(): React.ReactElement {
  // board data/actions
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move        = useBoardStore((s) => s.move);
  const byId        = useBoardStore((s) => s.byId);
  const order       = useBoardStore((s) => s.order);
  const loading     = useBoardStore((s) => s.loading);
  const error       = useBoardStore((s) => s.error);

  // auth
  const user = useAuthStore((s) => s.user);

  // socket
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId   = user?.groupId ?? 1;

  // bootstrap & join
  useBoardBootstrap(fetchInitial);
  useJoinGroup(joinGroup, groupId);

  // helpers
  const moveToPraise = useMoveToPraise();
  const renderCard   = usePrayerCardRenderer(byId as unknown as Map<number, any>); // Map is already correct
  const onMove       = useOnMove(move as (id: number, to: BoardColumnKey, idx: number) => Promise<boolean>);

  // active-only (single column)
  const activeIds = order.active;

  return (
    <main
      className="min-h-[70vh] px-3 sm:px-4 md:px-0 space-y-4 overflow-x-hidden"
      data-active-count={activeIds.length}
      data-loading={loading || undefined}
    >
      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {error && <div className="text-sm text-[var(--theme-error)]">{error}</div>}

      <SingleBoard
        title="Prayers"
        column="active"
        ids={activeIds}
        renderCard={renderCard as (id: number, c: ColumnKey, i: number) => React.ReactNode}
        onMoveWithin={(id, toIndex) => { onMove(id, 'active', toIndex); }}
        onDockDrop={(dock, id) => {
          // Stay on the same page (no navigation)
          if (dock === 'dock-archive') { onMove(id, 'archived', 0); }
          if (dock === 'dock-praise')  { moveToPraise(id); } // server-persisted
        }}
      />
      {/* Dock removed here; it's rendered inside SingleBoard's DndContext */}
    </main>
  );
}
