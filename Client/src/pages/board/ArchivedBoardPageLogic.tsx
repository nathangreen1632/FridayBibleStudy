// Client/src/pages/board/ArchivedBoardPageLogic.tsx
import React from 'react';
import ArchivedBoardPageView from '../../jsx/board/archivedBoardPageView.tsx';
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

export default function ArchiveBoard(): React.ReactElement {
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

  // archived-only (single column)
  const archivedIds = order.archived ?? [];

  const onMoveWithin: MoveWithinHandler = async (id, toIndex) => {
    try {
      await onMove(id, 'archived', toIndex);
    } catch {
      // no-throw policy
    }
  };

  const onDockDrop: DockDropHandler = async (dock, id) => {
    try {
      if (dock === 'dock-active') {
        await onMove(id, 'active', 0);
      }
      if (dock === 'dock-praise') {
        await moveToPraise(id);
      }
      // dock-archive is a no-op (already here)
    } catch {
      // no-throw policy
    }
  };

  return (
    <ArchivedBoardPageView
      archivedIds={archivedIds}
      loading={loading}
      error={error}
      renderCard={renderCard}
      onMoveWithin={onMoveWithin}
      onDockDrop={onDockDrop}
    />
  );
}
