import React, { useEffect } from 'react';
import PraisesBoardPageView from '../../jsx/board/praisesBoardPageView.tsx';
import { usePraisesStore, usePraisesIds } from '../../stores/usePraisesStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import type { DockDropHandler, MoveWithinHandler } from '../../types/pages/board.types.ts';

export default function PraisesBoard(): React.ReactElement {
  const fetchInitial = usePraisesStore((s) => s.fetchInitial);
  const moveWithin = usePraisesStore((s) => s.moveWithin);
  const movePrayer = usePraisesStore((s) => s.movePrayer);
  const ids = usePraisesIds();

  const user = useAuthStore((s) => s.user);
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId = user?.groupId ?? 1;

  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {

      }
    })();
  }, [fetchInitial]);


  useEffect(() => {
    try {
      if (groupId) joinGroup(groupId);
    } catch {

    }
  }, [groupId, joinGroup]);

  const onMoveWithin: MoveWithinHandler = async (id, toIndex) => {
    try {
      await moveWithin(id, toIndex);
    } catch {

    }
  };

  const onDockDrop: DockDropHandler = async (dock, id) => {
    try {
      if (dock === 'dock-active') {
        await movePrayer(id, 'active');
        return;
      }
      if (dock === 'dock-archive') {
        await movePrayer(id, 'archived');
        return;
      }

    } catch {

    }
  };

  return (
    <PraisesBoardPageView
      ids={ids}
      groupId={groupId ?? null}
      onMoveWithin={onMoveWithin}
      onDockDrop={onDockDrop}
    />
  );
}
