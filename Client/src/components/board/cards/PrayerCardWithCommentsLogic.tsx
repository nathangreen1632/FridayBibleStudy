import React from 'react';
import type { Status } from '../types/domain/domain.types.ts';
import type { PrayerCardWithCommentsProps } from '../types/ui/prayerCard.types.ts';
import PrayerCardWithCommentsView from '../jsx/board/prayerCardWithCommentsView.tsx';

export default function PrayerCardWithCommentsLogic(
  props: Readonly<PrayerCardWithCommentsProps>
): React.ReactElement {
  function handleMove(to: Status): void {
    try { props.onMove(props.id, to); } catch {}
  }

  return (
    <PrayerCardWithCommentsView
      id={props.id}
      title={props.title}
      content={props.content}
      author={props.author}
      category={props.category}
      createdAt={props.createdAt}
      groupId={props.groupId ?? null}
      onMove={handleMove}
    />
  );
}
