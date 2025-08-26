import React, { useEffect, useMemo, useState } from 'react';
import Board from '../../components/board/Board.board';
import PrayerCard from '../../components/board/PrayerCard.board';
import type { ListPrayersResponse } from '../../types/api.type';
import { api } from '../../helpers/http.helper';

type ColumnKey = 'active' | 'archived';

export default function PortalBoard(): React.ReactElement {
  const [items, setItems] = useState<ListPrayersResponse['items']>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [archivedIds, setArchivedIds] = useState<number[]>([]);

  // Fetch initial data
  useEffect(() => {
    void (async () => {
      const data = await api<ListPrayersResponse>('/api/prayers?page=1&pageSize=20');
      setItems(data.items);
      setActiveIds(data.items.filter(i => i.status === 'active').map(i => i.id));
      setArchivedIds(data.items.filter(i => i.status === 'archived').map(i => i.id));
    })();
  }, []);

  // Fast lookup for renderCard
  const byId = useMemo(() => {
    const map = new Map<number, ListPrayersResponse['items'][number]>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  function moveIdWithin(list: number[], id: number, toIndex: number): number[] {
    const arr = list.filter(x => x !== id);
    const clamped = Math.max(0, Math.min(toIndex, arr.length));
    arr.splice(clamped, 0, id);
    return arr;
  }

  async function onMove(id: number, toStatus: ColumnKey, newIndex: number): Promise<void> {
    // Optimistic local reorder
    if (toStatus === 'active') {
      setArchivedIds(prev => prev.filter(x => x !== id));
      setActiveIds(prev => moveIdWithin(prev.concat(id), id, newIndex));
    } else {
      setActiveIds(prev => prev.filter(x => x !== id));
      setArchivedIds(prev => moveIdWithin(prev.concat(id), id, newIndex));
    }

    // Update status in the items collection (for rendering card metadata)
    setItems(prev =>
      prev.map(p => (p.id === id ? { ...p, status: toStatus } : p))
    );

    // Persist to API (position can be newIndex; server may normalize)
    try {
      await api(`/api/prayers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, position: newIndex })
      });
    } catch (e) {
      // TODO: optional rollback or toast; for now we’ll leave optimistic state
      // console.error(e);
    }
  }

  // Card renderer given an id (Board + Column use this)
  const renderCard = (id: number, _column: ColumnKey, _index: number) => {
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

  return (
    <Board
      activeIds={activeIds}
      archivedIds={archivedIds}
      renderCard={renderCard}
      onMove={onMove}
    />
  );
}
