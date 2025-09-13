// Server/src/types/socket.events.ts
// Keep this list in sync with Client/src/types/socket.types.ts

export type Role = 'classic' | 'admin';
export type Category = 'prayer' | 'long-term' | 'salvation' | 'pregnancy' | 'birth' | 'praise';
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
  updatedAt: string;
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
  author?: AuthorLite | null;
  attachments?: AttachmentDTO[];
};

export type PrayerCreatedPayload = { prayer: PrayerDTO };
export type PrayerUpdatedPayload = { prayer: PrayerDTO };
export type PrayerMovedPayload   = { prayer: PrayerDTO; from: Status; to: Status };
export type PrayerDeletedPayload = { id: number };

// Comments/updates
export type CommentLite = {
  id: number;
  prayerId: number;
  authorId: number;
  authorName?: string | null;
  parentId?: number | null;
  threadRootId?: number | null;
  depth: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentCreatedPayload = { prayerId: number; comment: CommentLite; newCount: number; lastCommentAt: string | null };
export type CommentUpdatedPayload = { prayerId: number; comment: CommentLite };
export type CommentDeletedPayload = { prayerId: number; commentId: number; newCount: number; lastCommentAt: string | null };
export type CommentCountPayload   = { prayerId: number; newCount: number; lastCommentAt: string | null };
export type CommentsClosedPayload = { prayerId: number; isCommentsClosed: boolean };

export const Events = {
  PrayerCreated: 'prayer:created',
  PrayerUpdated: 'prayer:updated',
  PrayerMoved:   'prayer:moved',
  PrayerDeleted: 'prayer:deleted',

  // New comment system
  CommentCreated: 'comment:created',
  CommentUpdated: 'comment:updated',
  CommentDeleted: 'comment:deleted',
  CommentCount:   'prayer:commentCount',
  CommentsClosed: 'prayer:commentsClosed',
} as const;

export type EventKey = keyof typeof Events;
export type EventValue = (typeof Events)[EventKey];
