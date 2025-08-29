// Client/src/pages/portal/PortalBoard.portal.tsx
import React, { useEffect } from 'react';
import Board from '../../components/board/Board.board';
import PrayerCard from '../../components/board/PrayerCard.board';
import { useBoardStore } from '../../stores/board.store';
import { toast } from 'react-hot-toast';

type ColumnKey = 'active' | 'archived';

export default function PortalBoard(): React.ReactElement {
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move = useBoardStore((s) => s.move);
  const byId = useBoardStore((s) => s.byId);
  const order = useBoardStore((s) => s.order);
  const loading = useBoardStore((s) => s.loading);
  const error = useBoardStore((s) => s.error);

  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  const activeIds = order.active;
  const archivedIds = order.archived;

  const renderCard = (id: number) => {
    const item = byId.get(id);
    if (!item) return null;
    return (
      <PrayerCard
        id={item.id}
        title={item.title}
        author={item.author?.name}
        category={item.category}
        createdAt={item.createdAt}
      />
    );
  };

  async function onMove(id: number, toStatus: ColumnKey, newIndex: number): Promise<void> {
    const ok = await move(id, toStatus, newIndex);
    if (!ok) toast.error('Could not move prayer. Your changes were undone.');
  }

  return (
    <div className="space-y-4">
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
