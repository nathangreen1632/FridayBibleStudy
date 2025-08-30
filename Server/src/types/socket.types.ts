// Server/src/types/socket.events.ts
// Mirror your Client/src/types/domain.types.ts for on-the-wire payloads

export type Role = 'classic' | 'admin';
export type Category = 'prayer' | 'long-term' | 'salvation' | 'pregnancy' | 'birth';
export type Status = 'active' | 'praise' | 'archived';

export type AuthorLite = { id: number; name: string };

export type AttachmentDTO = {
  id: number;
  prayerId: number;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type PrayerDTO = {
  id: number;
  groupId: number;
  authorUserId: number;
  title: string;
  content: string;
  category: Category;
  status: Status;
  position: number;
  impersonatedByAdminId?: number | null;
  createdAt: string;
  updatedAt: string;
  author?: AuthorLite;
  attachments?: AttachmentDTO[];
};

export type PrayerCreatedPayload = { prayer: PrayerDTO };
export type PrayerUpdatedPayload = { prayer: PrayerDTO };
export type PrayerMovedPayload   = { prayer: PrayerDTO; from: Status; to: Status };

export type RosterUpdatedPayload = { userId: number; groupId: number };

export const Events = {
  PrayerCreated: 'prayer:created',
  PrayerUpdated: 'prayer:updated',
  PrayerMoved:   'prayer:moved',
  RosterUpdated: 'roster:updated',
} as const;

export type EventName = typeof Events[keyof typeof Events];
