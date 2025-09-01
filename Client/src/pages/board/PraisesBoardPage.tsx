// Client/src/pages/board/PraisesBoard.page.tsx
import React, { useEffect, useCallback } from 'react';
import SingleBoard from '../../components/board/SingleColumnBoard.tsx';
import PrayerCard from '../../components/PrayerCard.tsx';
import type { ColumnKey } from '../../components/SortableCard.tsx';
import { usePraisesStore, usePraisesIds, usePraiseById } from '../../stores/usePraisesStore.ts';

// Small wrapper so we can safely use a hook per-item
function PraiseCardFromStore({ id }: Readonly<{ id: number }>) {
  const p = usePraiseById(id);
  if (!p) return null;
  return (
    <PrayerCard
      id={p.id}
      title={p.title}
      content={p.content}
      author={p.author?.name ?? null}
      category={p.category}
      createdAt={p.createdAt}
    />
  );
}

export default function PraisesBoard(): React.ReactElement {
  const fetchInitial = usePraisesStore((s) => s.fetchInitial);
  const moveWithin  = usePraisesStore((s) => s.moveWithin);
  const movePrayer  = usePraisesStore((s) => s.movePrayer);
  const ids         = usePraisesIds();

  useEffect(() => { void fetchInitial(); }, [fetchInitial]);

  const renderCard = useCallback(
    (id: number, _column: ColumnKey, _index: number) => <PraiseCardFromStore id={id} />,
    []
  );

  return (
    <main className="min-h-[70vh] px-3 sm:px-4 md:px-0 overflow-x-hidden">
      <SingleBoard
        title="Praises"
        column="praise"
        ids={ids}
        renderCard={renderCard}
        onMoveWithin={(id, toIndex) => { void moveWithin(id, toIndex); }}
        onDockDrop={(dock, id) => {
          if (dock === 'dock-active')  { void movePrayer(id, 'active'); }
          if (dock === 'dock-archive') { void movePrayer(id, 'archived'); }
          // Stay on the same page per your rule; no navigation.
        }}
      />
      {/* Dock removed here; it's rendered inside SingleBoard's DndContext */}
    </main>
  );
}
