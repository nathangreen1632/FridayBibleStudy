// Client/src/pages/portal/PortalBoard.portal.tsx
import React, { useEffect } from 'react';
import Board from '../../components/board/Board.board';
import PrayerCard from '../../components/board/PrayerCard.board';
import { useBoardStore } from '../../stores/board.store';
import { useSocketStore } from '../../stores/socket.store';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/auth.store';

type ColumnKey = 'active' | 'archived';

export default function PortalBoard(): React.ReactElement {
  // board data/actions
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move = useBoardStore((s) => s.move);
  const byId = useBoardStore((s) => s.byId);
  const order = useBoardStore((s) => s.order);
  const loading = useBoardStore((s) => s.loading);
  const error = useBoardStore((s) => s.error);

  // auth
  const user = useAuthStore((s) => s.user);

  // socket: join the group once; live updates come in via socket.store → board.store
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId = user?.groupId ?? 1;

  // one-time bootstrap fetch
  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {
        // stores/components render existing error state
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

  const activeIds = order.active;
  const archivedIds = order.archived;

  const renderCard = (id: number) => {
    try {
      const item = byId.get(id);
      if (!item) return null;
      return (
        <PrayerCard
          id={item.id}
          title={item.title}
          content={item.content}
          author={item.author?.name}
          category={item.category}
          createdAt={item.createdAt}
        />
      );
    } catch {
      return null;
    }
  };

  async function onMove(id: number, toStatus: ColumnKey, newIndex: number): Promise<void> {
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
    <div
      className="space-y-4"
      data-active-count={activeIds.length}
      data-archived-count={archivedIds.length}
      data-loading={loading || undefined}
    >
      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Board
        activeIds={activeIds}
        archivedIds={archivedIds}
        renderCard={renderCard}
        onMove={onMove}
      />
    </div>
  );
}
