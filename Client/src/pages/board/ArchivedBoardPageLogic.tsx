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
  const fetchInitial = useBoardStore((s) => s.fetchInitial);
  const move = useBoardStore((s) => s.move);
  const byId = useBoardStore((s) => s.byId);
  const order = useBoardStore((s) => s.order);
  const loading = useBoardStore((s) => s.loading);
  const error = useBoardStore((s) => s.error);

  const user = useAuthStore((s) => s.user);

  const joinGroup = useSocketStore((s) => s.joinGroup);
  const groupId = user?.groupId ?? 1;

  useBoardBootstrap(fetchInitial);
  useJoinGroup(joinGroup, groupId);

  const moveToPraise = useMoveToPraise();
  const onMove = useOnMove(
    move as (id: number, to: BoardColumnKey, idx: number) => Promise<boolean>
  );
  const renderCard: RenderCardFn = usePrayerCardRenderer(
    byId as unknown as Map<number, any>,
    groupId
  );

  const archivedIds = order.archived ?? [];

  const onMoveWithin: MoveWithinHandler = async (id, toIndex) => {
    try {
      await onMove(id, 'archived', toIndex);
    } catch {
      console.error('Failed to move prayer to archived', id, toIndex);
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

    } catch {

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
