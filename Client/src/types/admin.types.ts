// Client/src/types/admin.types.ts
export type AdminPrayerRow = {
  id: number;
  groupId: number;
  groupName: string;
  authorUserId: number;
  authorName: string;
  title: string;
  category: 'prayer' | 'long-term' | 'salvation' | 'pregnancy' | 'birth' | 'praise';
  status: 'active' | 'praise' | 'archived';
  commentCount: number;
  lastCommentAt: string | null;
  updatedAt: string;
};

export type AdminListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
