// Client/src/pages/board/ActiveBoard.page.tsx
import React, { useEffect, useCallback } from 'react';
import SingleBoard from '../../components/board/SingleColumnBoard.tsx';
import PrayerCard from '../../components/PrayerCard.tsx';
import { useBoardStore } from '../../stores/board.store';
import { useSocketStore } from '../../stores/socket.store';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/auth.store';
import type { ColumnKey } from '../../components/SortableCard.tsx';
import { apiWithRecaptcha } from '../../helpers/secure-api.helper';

// Only the two board columns are valid for in-column moves
type BoardColumnKey = 'active' | 'archived';

export default function ActiveBoard(): React.ReactElement {
  // board data/actions
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move        = useBoardStore((s) => s.move);        // reorder or move between active/archived
  const byId        = useBoardStore((s) => s.byId);
  const order       = useBoardStore((s) => s.order);
  const loading     = useBoardStore((s) => s.loading);
  const error       = useBoardStore((s) => s.error);

  // auth
  const user = useAuthStore((s) => s.user);

  // socket: join the group once; live updates come in via socket.store → board.store
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId   = user?.groupId ?? 1;

  // one-time bootstrap fetch
  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {
        // store exposes error state; keep UI responsive
      }
    })();
  }, [fetchInitial]);

  // join the user's group room so this board receives real-time events
  useEffect(() => {
    try {
      if (groupId) joinGroup(groupId);
    } catch {
      // ignore; UI remains usable without socket
    }
  }, [groupId, joinGroup]);

  // server-persisted move-to-praise
  const moveToPraise = useCallback(async (id: number) => {
    try {
      await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'praise', position: 0 }),
      });
      // No toast here; socket will reconcile across boards.
    } catch {
      // follow project guideline: swallow; store/socket will correct state
    }
  }, []);

  // active-only (single column)
  const activeIds = order.active;

  const renderCard = useCallback(
    (id: number, _column: ColumnKey, _index: number) => {
      try {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <PrayerCard
            id={item.id}
            title={item.title}
            content={item.content}
            author={item.author?.name ?? null}
            category={item.category}
            createdAt={item.createdAt}
          />
        );
      } catch {
        return null;
      }
    },
    [byId]
  );

  // In-column / active<->archived moves
  async function onMove(id: number, toStatus: BoardColumnKey, newIndex: number): Promise<void> {
    try {
      const ok = await move(id, toStatus, newIndex);
      if (!ok) toast.error('Could not move prayer. Your changes were undone.');
    } catch {
      // keep UI responsive; store will reconcile state
    }
  }

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
        renderCard={renderCard}
        onMoveWithin={(id, toIndex) => { void onMove(id, 'active', toIndex); }}
        onDockDrop={(dock, id) => {
          // Stay on the same page (no navigation)
          if (dock === 'dock-archive') { void onMove(id, 'archived', 0); }
          if (dock === 'dock-praise')  { void moveToPraise(id); } // server-persisted
        }}
      />
      {/* Dock removed here; it's rendered inside SingleBoard's DndContext */}
    </main>
  );
}
