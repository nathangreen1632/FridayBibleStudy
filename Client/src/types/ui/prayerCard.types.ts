import type { Category, Status } from '../domain/domain.types.ts';

export type PrayerCardWithCommentsProps = Readonly<{
  id: number;
  title: string;
  content: string;
  author: string | null;
  category: Category;
  createdAt: string;
  groupId?: number | null;
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
  onMove: (to: Status) => void;
}>;
