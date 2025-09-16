// Client/src/types/bible.types.ts

export type BibleMeta = {
  id: string;
  name: string;
  abbreviationLocal?: string;
  language?: { name?: string };
};

export type PassageItem = { content?: string; reference?: string };

export type BookMeta = { id: string; name?: string; abbreviation?: string };

export type ChapterLite = { id: string; number?: number; reference?: string };

export type VersionOption = { id: string; label: string };
