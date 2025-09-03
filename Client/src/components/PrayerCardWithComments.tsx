import React from 'react';
import PrayerCard from './PrayerCard';
import CommentsPanel from './CommentsPanel';
import type { Category } from '../types/domain.types';

export default function PrayerCardWithComments(props: Readonly<{
  id: number;
  title: string;
  content: string;
  author: string | null;
  category: Category;           // ✅ use union type, not string
  createdAt: string;
  groupId?: number | null;
}>): React.ReactElement {
  return (
    <div className="rounded-2xl shadow-md" style={{ background: 'var(--theme-text)' }}>
      <PrayerCard
        id={props.id}
        title={props.title}
        content={props.content}
        author={props.author}
        category={props.category}    // now matches Category
        createdAt={props.createdAt}
      />
      <div className="bg-[var(--theme-text)] rounded-2xl px-3 pb-3">
        <CommentsPanel prayerId={props.id} groupId={props.groupId ?? null} />
      </div>
    </div>
  );
}
