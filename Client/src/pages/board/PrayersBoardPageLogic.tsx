// Client/src/pages/board/PrayersBoardPageLogic.tsx
import React from 'react';
import PrayersBoardPageView from '../../jsx/board/prayersBoardPageView.tsx';
import { useBoardStore } from '../../stores/useBoardStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  useBoardBootstrap,
  useJoinGroup,
  useMoveToPraise,
  usePrayerCardRenderer,
  useOnMove,
} from '../../helpers/boardPage.helper';
import type {
  BoardColumnKey,
  DockDropHandler,
  MoveWithinHandler,
  RenderCardFn,
} from '../../types/pages/board.types.ts';

export default function ActiveBoard(): React.ReactElement {
  // board data/actions
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move = useBoardStore((s) => s.move);
  const byId = useBoardStore((s) => s.byId);
  const order = useBoardStore((s) => s.order);
  const loading = useBoardStore((s) => s.loading);
  const error = useBoardStore((s) => s.error);

  // auth
  const user = useAuthStore((s) => s.user);

  // socket
  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId = user?.groupId ?? 1;

  // bootstrap & join
  useBoardBootstrap(fetchInitial);
  useJoinGroup(joinGroup, groupId);

  // helpers
  const moveToPraise = useMoveToPraise();
  const onMove = useOnMove(
    move as (id: number, to: BoardColumnKey, idx: number) => Promise<boolean>
  );
  const renderCard: RenderCardFn = usePrayerCardRenderer(
    byId as unknown as Map<number, any>,
    groupId
  );

  // active-only (single column)
  const activeIds = order.active;

  const onMoveWithin: MoveWithinHandler = async (id, toIndex) => {
    try {
      await onMove(id, 'active', toIndex);
    } catch {
      // no-throw policy
    }
  };

  const onDockDrop: DockDropHandler = async (dock, id) => {
    try {
      if (dock === 'dock-archive') {
        await onMove(id, 'archived', 0);
      }
      if (dock === 'dock-praise') {
        await moveToPraise(id);
      }
    } catch {
      // no-throw policy
    }
  };

  return (
    <PrayersBoardPageView
      activeIds={activeIds}
      loading={loading}
      error={error}
      renderCard={renderCard}
      onMoveWithin={onMoveWithin}
      onDockDrop={onDockDrop}
    />
  );
}
