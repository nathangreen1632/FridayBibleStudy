// Client/src/pages/board/PraisesBoardPageLogic.tsx
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

  // auth & sockets (match other boards)
  const user = useAuthStore((s) => s.user);
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId = user?.groupId ?? 1;

  // initial load
  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {
        // no-throw policy
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

  const onMoveWithin: MoveWithinHandler = async (id, toIndex) => {
    try {
      await moveWithin(id, toIndex);
    } catch {
      // no-throw policy
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
      // 'dock-praise' is a no-op here (already in praise)
    } catch {
      // no-throw policy
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
