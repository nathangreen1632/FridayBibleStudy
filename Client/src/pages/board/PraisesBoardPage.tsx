// Client/src/pages/board/PraisesBoardPage.tsx
import React, { useEffect, useCallback } from 'react';
import SingleBoard from '../../components/board/SingleColumnBoard';
import PrayerCardWithComments from '../../components/PrayerCardWithComments';
import type { ColumnKey } from '../../components/SortableCard';
import { usePraisesStore, usePraisesIds, usePraiseById } from '../../stores/usePraisesStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';

// Small wrapper so we can safely use a hook per-item
function PraiseCardFromStore({ id, groupId }: Readonly<{ id: number; groupId: number | null }>) {
  const p = usePraiseById(id);
  if (!p) return null;
  return (
    <PrayerCardWithComments
      id={p.id}
      title={p.title}
      content={p.content}
      author={p.author?.name ?? null}
      category={p.category}
      createdAt={p.createdAt}
      groupId={groupId}
    />
  );
}

export default function PraisesBoard(): React.ReactElement {
  const fetchInitial = usePraisesStore((s) => s.fetchInitial);
  const moveWithin  = usePraisesStore((s) => s.moveWithin);
  const movePrayer  = usePraisesStore((s) => s.movePrayer);
  const ids         = usePraisesIds();

  // auth & sockets (match Active/Archive pages)
  const user      = useAuthStore((s) => s.user);
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId   = user?.groupId ?? 1;

  // initial load
  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {
        // ignore or log
      }
    })();
  }, [fetchInitial]);

  // join the user's group room for real-time events
  useEffect(() => {
    try {
      if (groupId) joinGroup(groupId);
    } catch {
      // ignore; UI remains usable without socket
    }
  }, [groupId, joinGroup]);

  const renderCard = useCallback(
    (id: number, _column: ColumnKey, _index: number) => <PraiseCardFromStore id={id} groupId={groupId ?? null} />,
    [groupId]
  );

  return (
    <main className="min-h-[70vh] px-3 sm:px-4 md:px-0 overflow-x-hidden">
      <SingleBoard
        title="Praises"
        column="praise"
        ids={ids}
        renderCard={renderCard}
        onMoveWithin={async (id, toIndex) => {
          try {
            await moveWithin(id, toIndex);
          } catch {
            // ignore or log
          }
        }}

        onDockDrop={async (dock, id) => {
          try {
            if (dock === 'dock-active') {
              await movePrayer(id, 'active');
            }
            if (dock === 'dock-archive') {
              await movePrayer(id, 'archived');
            }
            // Stay on the same page per your rule; no navigation.
          } catch {
            // ignore or log
          }
        }}
      />
      {/* Dock removed here; it's rendered inside SingleBoard's DndContext */}
    </main>
  );
}
