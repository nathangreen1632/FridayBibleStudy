import React, { useEffect, useMemo, useState } from 'react';
import Board from '../../components/board/Board.board';
import PrayerCard from '../../components/board/PrayerCard.board';
import type { ListPrayersResponse } from '../../types/api.type';
import { api } from '../../helpers/http.helper';
import { apiWithRecaptcha } from '../../helpers/secure-api.helper';
import { toast } from 'react-hot-toast';

type ColumnKey = 'active' | 'archived';

export default function PortalBoard(): React.ReactElement {
  const [items, setItems] = useState<ListPrayersResponse['items']>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [archivedIds, setArchivedIds] = useState<number[]>([]);

  // Fetch initial data
  useEffect(() => {
    void (async () => {
      const data = await api<ListPrayersResponse>('/api/prayers?page=1&pageSize=20');

      // sort by position within each status and map to ids
      const act = data.items
        .filter(i => i.status === 'active')
        .sort((a, b) => a.position - b.position)
        .map(i => i.id);

      const arch = data.items
        .filter(i => i.status === 'archived')
        .sort((a, b) => a.position - b.position)
        .map(i => i.id);

      setItems(data.items);
      setActiveIds(act);
      setArchivedIds(arch);
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
    // capture previous state for rollback
    const prevActiveIds = activeIds;
    const prevArchivedIds = archivedIds;
    const prevItems = items;

    // optimistic reordering of id lists
    if (toStatus === 'active') {
      setArchivedIds(prev => prev.filter(x => x !== id));
      setActiveIds(prev => moveIdWithin(prev.concat(id), id, newIndex));
    } else {
      setActiveIds(prev => prev.filter(x => x !== id));
      setArchivedIds(prev => moveIdWithin(prev.concat(id), id, newIndex));
    }

    // optimistic item status + position update
    setItems(prev => {
      // compute new positions in each column from the id arrays we just set
      const next = prev.map(p => ({ ...p }));
      const posById = new Map<number, number>();
      (toStatus === 'active' ? activeIds : archivedIds).forEach((pid, i) => posById.set(pid, i));
      // include the just-moved id at its new index
      if (toStatus === 'active') {
        const arr = moveIdWithin(activeIds.concat(id), id, newIndex);
        arr.forEach((pid, i) => posById.set(pid, i));
      } else {
        const arr = moveIdWithin(archivedIds.concat(id), id, newIndex);
        arr.forEach((pid, i) => posById.set(pid, i));
      }

      for (const p of next) {
        if (p.id === id) {
          p.status = toStatus;
        }
        const maybe = posById.get(p.id);
        if (maybe !== undefined && p.status === toStatus) {
          p.position = maybe;
        }
      }
      return next;
    });

// persist to API with reCAPTCHA (middleware expects 'prayer_update')
    try {
      await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, position: newIndex }), // ← stringify
      });
    } catch (e) {
      // rollback
      setActiveIds(prevActiveIds);
      setArchivedIds(prevArchivedIds);
      setItems(prevItems);

      console.error('Failed to move prayer', e); // ← use the exception (satisfies S2486)
      toast.error('Could not move prayer. Your changes were undone.');
      return; // optional: make intent explicit for linters
    }
  }

  // Board expects (id, column, index)
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

  return (
    <Board
      activeIds={activeIds}
      archivedIds={archivedIds}
      renderCard={renderCard}
      onMove={onMove}
    />
  );
}
