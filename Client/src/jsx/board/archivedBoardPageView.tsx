import React from 'react';
import SingleBoard from '../../components/board/containers/SingleColumnBoard.tsx';
import type {
  DockDropHandler,
  MoveWithinHandler,
  RenderCardFn,
} from '../../types/pages/board.types.ts';

type Props = {
  archivedIds: number[];
  loading: boolean;
  error?: string | null;
  renderCard: RenderCardFn;
  onMoveWithin: MoveWithinHandler;
  onDockDrop: DockDropHandler;
};

export default function ArchivedBoardPageView({
                                                archivedIds,
                                                loading,
                                                error,
                                                renderCard,
                                                onMoveWithin,
                                                onDockDrop,
                                              }: Readonly<Props>): React.ReactElement {
  return (
    <main
      className="min-h-[70vh] px-3 sm:px-4 md:px-0 space-y-4 overflow-x-hidden"
      data-archived-count={archivedIds.length}
      data-loading={loading || undefined}
    >
      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {Boolean(error) && (
        <div className="text-sm text-[var(--theme-error)]">{error}</div>
      )}

      <SingleBoard
        title="Archived"
        column="archived"
        ids={archivedIds}
        renderCard={renderCard}
        onMoveWithin={async (id, toIndex) => {
          try {
            await onMoveWithin(id, toIndex);
          } catch {

          }
        }}
        onDockDrop={async (dock, id) => {
          try {
            await onDockDrop(dock, id);
          } catch {

          }
        }}
      />
    </main>
  );
}
