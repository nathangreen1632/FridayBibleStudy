// Client/src/components/PrayerCardWithComments.tsx
import React from 'react';
import PrayerCard from './PrayerCard';
import CommentsPanel from './CommentsPanel';
import type { Category, Status } from '../types/domain.types';
import { pressBtn } from '../../ui/press.ts';

type Props = Readonly<{
  id: number;
  title: string;
  content: string;
  author: string | null;
  category: Category;
  createdAt: string;
  groupId?: number | null;
  /** Called when user taps a Move button (mobile only). Parent should move the card. */
  onMove: (id: number, to: Status) => void;
}>;

/* Top-level subcomponent (keeps Sonar happy; no nested ternaries) */
function MobileMoveActions(props: Readonly<{
  onMove: (to: Status) => void;
}>): React.ReactElement {
  return (
    // Visible on < lg (phones + tablets), hidden on desktop and larger
    <div className="xl:hidden mt-2 pt-2 border-t border-[var(--theme-border)]">
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--theme-moveto)]">Move To →</span>

        <button
          type="button"
          onClick={() => props.onMove('active')}
          className={pressBtn(
            'px-2 py-1 rounded bg-[var(--theme-pill-orange)] text-[var(--theme-textbox)] hover:bg-[var(--theme-pill-orange)] hover:text-[var(--theme-textbox)] cursor-pointer'
          )}
        >
          Prayers
        </button>

        <button
          type="button"
          onClick={() => props.onMove('praise')}
          className={pressBtn(
            'px-2 py-1 rounded bg-[var(--theme-pill-green)] text-[var(--theme-textbox)] hover:bg-[var(--theme-pill-green)] hover:text-[var(--theme-textbox)] cursor-pointer'
          )}
        >
          Praise
        </button>

        <button
          type="button"
          onClick={() => props.onMove('archived')}
          className={pressBtn(
            'px-2 py-1 rounded bg-[var(--theme-button-hover)] text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] cursor-pointer'
          )}
        >
          Archive
        </button>
      </div>
    </div>
  );
}

export default function PrayerCardWithComments(props: Props): React.ReactElement {
  function handleMove(to: Status) {
    try {
      props.onMove(props.id, to);
    } catch {
      // swallow; parent should handle errors
    }
  }

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

        {/* Mobile-only Move bar (bottom of the card) */}
        <MobileMoveActions onMove={handleMove} />
      </div>
    </div>
  );
}
