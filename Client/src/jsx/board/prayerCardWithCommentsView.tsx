import React from 'react';
import PrayerCard from '../../components/board/cards/PrayerCard.tsx';
import CommentsPanel from '../../components/board/panels/CommentsPanelLogic.tsx';
import type { Status } from '../../types/domain/domain.types.ts';
import type { PrayerCardWithCommentsViewProps} from '../../types/ui/prayerCard.types.ts';
import { pressBtn } from '../../../ui/press.ts';

function MobileMoveActions(props: Readonly<{ onMove: (to: Status) => void }>): React.ReactElement {
  return (
    <div className="xl:hidden mt-2 pt-2 border-t border-[var(--theme-border)]">
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--theme-moveto)]">Move To →</span>

        <button
          type="button"
          onClick={() => props.onMove('active')}
          className={pressBtn('px-2 py-1 rounded bg-[var(--theme-pill-orange)] text-[var(--theme-textbox)] hover:bg-[var(--theme-pill-orange)] hover:text-[var(--theme-textbox)] cursor-pointer')}
        >
          Prayers
        </button>

        <button
          type="button"
          onClick={() => props.onMove('praise')}
          className={pressBtn('px-2 py-1 rounded bg-[var(--theme-pill-green)] text-[var(--theme-textbox)] hover:bg-[var(--theme-pill-green)] hover:text-[var(--theme-textbox)] cursor-pointer')}
        >
          Praises
        </button>

        <button
          type="button"
          onClick={() => props.onMove('archived')}
          className={pressBtn('px-2 py-1 rounded bg-[var(--theme-button-hover)] text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] cursor-pointer')}
        >
          Archived
        </button>
      </div>
    </div>
  );
}

export default function PrayerCardWithCommentsView(
  props: PrayerCardWithCommentsViewProps
): React.ReactElement {
  return (
    <div className="rounded-2xl shadow-md" style={{ background: 'var(--theme-text)' }}>
      <PrayerCard
        id={props.id}
        title={props.title}
        content={props.content}
        author={props.author}
        category={props.category}
        createdAt={props.createdAt}
      />

      <div className="bg-[var(--theme-text)] rounded-2xl px-3 pb-3">
        <CommentsPanel prayerId={props.id} groupId={props.groupId ?? null} />
        <MobileMoveActions onMove={props.onMove} />
      </div>
    </div>
  );
}
