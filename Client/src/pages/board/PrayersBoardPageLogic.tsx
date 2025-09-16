// Client/src/pages/board/PrayersBoardPage.tsx
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
import VerseOfDayPanel from '../../components/VerseOfDayPanelLogic.tsx';

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
  const onMove       = useOnMove(move as (id: number, to: BoardColumnKey, idx: number) => Promise<boolean>);
  const renderCard   = usePrayerCardRenderer(byId as unknown as Map<number, any>, groupId);

  // active-only (single column)
  const activeIds = order.active;

  return (
    <main
      className={[
        // match PraisesBoardPage container:
        'min-h-[70vh] px-3 sm:px-4 md:px-0 overflow-x-hidden',
        // add left padding at ultra-wide so the fixed left rail never overlaps content
        'min-[1440px]:pl-[17rem]',
      ].join(' ')}
      data-active-count={activeIds.length}
      data-loading={loading || undefined}
    >
      {/* Left rail (fixed at ≥1440px); does not affect layout width */}
      <VerseOfDayPanel />

      {loading && <div className="text-sm opacity-70 mb-3">Loading…</div>}
      {error && <div className="text-sm text-[var(--theme-error)] mb-3">{error}</div>}

      <SingleBoard
        title="Prayers"
        column="active"
        ids={activeIds}
        renderCard={renderCard}
        onMoveWithin={async (id, toIndex) => {
          try {
            await onMove(id, 'active', toIndex);
          } catch {
            // ignore or log
          }
        }}
        onDockDrop={async (dock, id) => {
          try {
            if (dock === 'dock-archive') {
              await onMove(id, 'archived', 0);
            }
            if (dock === 'dock-praise') {
              await moveToPraise(id); // server-persisted
            }
          } catch {
            // ignore or log
          }
        }}
      />
      {/* Dock remains rendered inside SingleBoard's DndContext (same as Praises) */}
    </main>
  );
}
