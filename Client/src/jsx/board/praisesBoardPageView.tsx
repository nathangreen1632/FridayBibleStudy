// Client/src/jsx/praisesBoardPageView.tsx
import React, { useCallback } from 'react';
import SingleBoard from '../../components/board/containers/SingleColumnBoard.tsx';
import PrayerCardWithComments from '../../components/board/cards/PrayerCardWithCommentsLogic.tsx';
import type { ColumnKey } from '../../components/board/dnd/SortableCard.tsx';
import type { Status } from '../../types/domain/domain.types.ts';
import { usePraiseById } from '../../stores/usePraisesStore.ts';
import { useMoveToStatus } from '../../helpers/boardPage.helper.ts';
import { toast } from 'react-hot-toast';

import type {
  DockDropHandler,
  MoveWithinHandler,
} from '../../types/pages/board.types.ts';

type PraiseCardProps = {
  id: number;
  groupId: number | null;
};

/** Small wrapper: safe place to call item-scoped hooks */
function PraiseCardFromStore({
                               id,
                               groupId,
                             }: Readonly<PraiseCardProps>): React.ReactElement | null {
  const p = usePraiseById(id);
  const moveToStatus = useMoveToStatus(); // recaptcha + PATCH + position:0

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
      onMove={async (prayerId: number, to: Status) => {
        try {
          await moveToStatus(prayerId, to); // persist; sockets reconcile
        } catch {
          // keep UI resilient; notify user
          // eslint-disable-next-line no-console
          console.error('Failed to move prayer to status', to);
          toast.error('Failed to move prayer to status');
        }
      }}
    />
  );
}

type Props = {
  ids: number[];
  groupId: number | null;
  onMoveWithin: MoveWithinHandler;
  onDockDrop: DockDropHandler;
};

export default function PraisesBoardPageView({
                                               ids,
                                               groupId,
                                               onMoveWithin,
                                               onDockDrop,
                                             }: Readonly<Props>): React.ReactElement {
  const renderCard = useCallback(
    (id: number, _column: ColumnKey, _index: number) => (
      <PraiseCardFromStore id={id} groupId={groupId} />
    ),
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
            await onMoveWithin(id, toIndex);
          } catch {
            // swallow; upstream guards
          }
        }}
        onDockDrop={async (dock, id) => {
          try {
            await onDockDrop(dock, id);
          } catch {
            // swallow; upstream guards
          }
        }}
      />
      {/* Dock is rendered inside SingleBoard's DndContext */}
    </main>
  );
}
