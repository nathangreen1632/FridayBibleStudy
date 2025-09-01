// Client/src/pages/board/ArchiveBoard.page.tsx
import React, { useEffect, useCallback } from 'react';
import SingleBoard from '../../components/board/SingleColumnBoard.tsx';
import PrayerCard from '../../components/PrayerCard.tsx';
import { useBoardStore } from '../../stores/useBoardStore.ts';
import { useSocketStore } from '../../stores/useSocketStore.ts';
import { useAuthStore } from '../../stores/useAuthStore.ts';
import { toast } from 'react-hot-toast';
import type { ColumnKey } from '../../components/SortableCard.tsx';
import { apiWithRecaptcha } from '../../helpers/secure-api.helper';

// Only the two board columns are reorderable within this store
type BoardColumnKey = 'active' | 'archived';

export default function ArchiveBoard(): React.ReactElement {
  // board data/actions
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move        = useBoardStore((s) => s.move);        // reorder within a column / move between active<->archived
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
      if (groupId) {
        joinGroup(groupId);
      }
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
      // No toast; socket will reconcile across boards.
    } catch {
      // swallow; store/socket will correct if needed
    }
  }, []);

  // archived-only (single column)
  const archivedIds = order.archived ?? [];

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

  // Helper for in-column / active<->archived moves
  async function onMove(id: number, toStatus: BoardColumnKey, newIndex: number): Promise<void> {
    try {
      const ok = await move(id, toStatus, newIndex);
      if (!ok) {
        toast.error('Could not move prayer. Your changes were undone.');
      }
    } catch {
      // keep UI responsive; store will reconcile state
    }
  }

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
