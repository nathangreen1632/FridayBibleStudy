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

// …existing exports…

export type AdminUiSnapshot = {
  q: string;
  status?: 'active' | 'praise' | 'archived';
  category?: 'birth' | 'long-term' | 'praise' | 'prayer' | 'pregnancy' | 'salvation';
  page?: number;
  pageSize?: number;
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

export const CATEGORY_OPTIONS = ['birth', 'long-term', 'praise', 'prayer', 'pregnancy', 'salvation'] as const;
export type Category = typeof CATEGORY_OPTIONS[number];

export const STATUS_OPTIONS = ['active', 'praise', 'archived'] as const;
export type Status = typeof STATUS_OPTIONS[number];

export type AdminFiltersPatch = Partial<{
  q: string;
  category: Category | undefined;
  status: Status | undefined;
  page: number;
}>;

export function isCategory(v: string): v is Category {
  return (CATEGORY_OPTIONS as readonly string[]).includes(v);
}

export function isStatus(v: string): v is Status {
  return (STATUS_OPTIONS as readonly string[]).includes(v);
}

// Add this near other admin UI types
export type AdminPrayerSummaryData = {
  title: string;
  authorName: string;
  groupName: string;
  category: string;          // uses your canonical literals elsewhere
  statusDisplay: string;     // "Prayer" / "Praise" / "Archived"
  updatedAt?: Date;
  lastCommentAt?: Date;
  commentCount: number;
  content: string;
};
