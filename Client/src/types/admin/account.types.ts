// Client/src/types/account.types.ts
import type { Category } from '../domain/domain.types.ts';

// allow empty string for the placeholder until a real selection is made
export type CategoryOption = Category | '';

export type PrayerDraft = {
  title: string;
  content: string;
  category: CategoryOption;
};

