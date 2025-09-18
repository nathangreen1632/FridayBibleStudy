export const Events = {
  PrayerCreated: 'prayer:created',
  PrayerUpdated: 'prayer:updated',
  PrayerMoved: 'prayer:moved',
  PrayerDeleted: 'prayer:deleted',

  UpdateCreated: 'update:created',
  UpdateDeleted: 'update:deleted',

  CommentCreated: 'comment:created',
  CommentUpdated: 'comment:updated',
  CommentDeleted: 'comment:deleted',
  CommentsClosed: 'prayer:commentsClosed',
  CommentCount: 'prayer:commentCount',
} as const;

export type EventKey = keyof typeof Events;
export type EventValue = (typeof Events)[EventKey];
