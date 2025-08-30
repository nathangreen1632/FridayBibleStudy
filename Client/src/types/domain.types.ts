export type Role = 'classic' | 'admin';
export type Category = 'prayer' | 'long-term' | 'salvation' | 'pregnancy' | 'birth';
export type Status = 'active' | 'praise' | 'archived';

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: number;
  prayerId: number;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Prayer {
  id: number;
  groupId: number;
  authorUserId: number;
  title: string;
  content: string;
  category: Category;
  status: Status;        // 'active' | 'main' | 'archived'
  position: number;
  impersonatedByAdminId?: number | null;
  createdAt: string;
  updatedAt: string;
  author?: Pick<User, 'id'|'name'>;
  attachments?: Attachment[];
}

export interface PrayerUpdate {
  id: number;
  prayerId: number;
  authorUserId: number;
  content: string;
  createdAt: string;
  author?: Pick<User, 'id'|'name'>;
}
