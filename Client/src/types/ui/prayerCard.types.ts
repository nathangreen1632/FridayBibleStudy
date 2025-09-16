import type { Category, Status } from '../domain/domain.types.ts';

export type PrayerCardWithCommentsProps = Readonly<{
  id: number;
  title: string;
  content: string;
  author: string | null;
  category: Category;
  createdAt: string;
  groupId?: number | null;
  /** Parent handles moving the card by id */
  onMove: (id: number, to: Status) => void;
}>;

export type PrayerCardWithCommentsViewProps = Readonly<{
  id: number;
  title: string;
  content: string;
  author: string | null;
  category: Category;
  createdAt: string;
  groupId?: number | null;
  /** Already bound to this card's id */
  onMove: (to: Status) => void;
}>;
