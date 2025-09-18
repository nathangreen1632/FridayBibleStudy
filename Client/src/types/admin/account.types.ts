import type { Category } from '../domain/domain.types.ts';

export type CategoryOption = Category | '';

export type PrayerDraft = {
  title: string;
  content: string;
  category: CategoryOption;
};

