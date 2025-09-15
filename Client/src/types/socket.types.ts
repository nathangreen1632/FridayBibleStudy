// Client/src/types/socket.types.ts

// Use a const object instead of `enum`
export const Events = {
  PrayerCreated: 'prayer:created',
  PrayerUpdated: 'prayer:updated',
  PrayerMoved: 'prayer:moved',
  PrayerDeleted: 'prayer:deleted',

  UpdateCreated: 'update:created',
  UpdateDeleted: 'update:deleted',   // ✅ NEW

  CommentCreated: 'comment:created',
  CommentUpdated: 'comment:updated',
  CommentDeleted: 'comment:deleted',
  CommentsClosed: 'prayer:commentsClosed',
  CommentCount: 'prayer:commentCount',
} as const;

// Derive type for strong typing if you want
export type EventKey = keyof typeof Events;
export type EventValue = (typeof Events)[EventKey];
