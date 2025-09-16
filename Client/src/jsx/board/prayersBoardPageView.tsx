// Client/src/jsx/prayersBoardPageView.tsx
import React from 'react';
import SingleBoard from '../../components/board/containers/SingleColumnBoard.tsx';
import VerseOfDayPanel from '../../components/verse/VerseOfDayPanelLogic.tsx';
import type {
  DockDropHandler,
  MoveWithinHandler,
  RenderCardFn,
} from '../../types/pages/board.types.ts';

type Props = {
  activeIds: number[];
  loading: boolean;
  error?: string | null;
  renderCard: RenderCardFn;
  onMoveWithin: MoveWithinHandler;
  onDockDrop: DockDropHandler;
};

export default function PrayersBoardPageView({
                                               activeIds,
                                               loading,
                                               error,
                                               renderCard,
                                               onMoveWithin,
                                               onDockDrop,
                                             }: Readonly<Props>): React.ReactElement {
  return (
    <main
      className={[
        'min-h-[70vh] px-3 sm:px-4 md:px-0 overflow-x-hidden',
        'min-[1440px]:pl-[17rem]',
      ].join(' ')}
      data-active-count={activeIds.length}
      data-loading={loading || undefined}
    >
      {/* Left rail (fixed ≥1440px) */}
      <VerseOfDayPanel />

      {loading && <div className="text-sm opacity-70 mb-3">Loading…</div>}
      {Boolean(error) && (
        <div className="text-sm text-[var(--theme-error)] mb-3">{error}</div>
      )}

      <SingleBoard
        title="Prayers"
        column="active"
        ids={activeIds}
        renderCard={renderCard}
        onMoveWithin={async (id, toIndex) => {
          try {
            await onMoveWithin(id, toIndex);
          } catch {
            // keep UI resilient; upstream handlers guard
          }
        }}
        onDockDrop={async (dock, id) => {
          try {
            await onDockDrop(dock, id);
          } catch {
            // keep UI resilient; upstream handlers guard
          }
        }}
      />
      {/* Dock remains inside SingleBoard's DndContext */}
    </main>
  );
}
