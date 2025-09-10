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

export type AdminRosterRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;
  // NEW:
  emailPaused: boolean;
};


export type AdminListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

