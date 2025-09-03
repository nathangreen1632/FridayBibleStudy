import React from 'react';
import SingleBoard from '../../components/board/SingleColumnBoard';
import { useBoardStore } from '../../stores/useBoardStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  useBoardBootstrap,
  useJoinGroup,
  useMoveToPraise,
  usePrayerCardRenderer,
  useOnMove,
} from '../../helpers/boardPage.helper';

// Only the two board columns are reorderable within this store
type BoardColumnKey = 'active' | 'archived';

export default function ArchiveBoard(): React.ReactElement {
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
  const onMove       = useOnMove(move as (id: number, to: BoardColumnKey, idx: number) => Promise<boolean>);
  const renderCard   = usePrayerCardRenderer(byId as unknown as Map<number, any>, groupId);

  // archived-only (single column)
  const archivedIds = order.archived ?? [];

  return (
    <main
      className="min-h-[70vh] px-3 sm:px-4 md:px-0 space-y-4 overflow-x-hidden"
      data-archived-count={archivedIds.length}
      data-loading={loading || undefined}
    >
      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {error && <div className="text-sm text-[var(--theme-error)]">{error}</div>}

      <SingleBoard
        title="Archived"
        column="archived"
        ids={archivedIds}
        renderCard={renderCard}
        onMoveWithin={(id, toIndex) => { void onMove(id, 'archived', toIndex); }}
        onDockDrop={(dock, id) => {
          if (dock === 'dock-active')  { void onMove(id, 'active', 0); }
          if (dock === 'dock-praise')  { void moveToPraise(id); } // server-persisted
          // Stay on this page per your rule; no navigation.
        }}
      />
      {/* Dock removed here; it's rendered inside SingleBoard's DndContext */}
    </main>
  );
}
