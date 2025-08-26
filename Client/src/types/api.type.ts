import type { Role, Category, Status } from './domain.types';

export interface AuthUser {
  id: number; name: string; email: string; role: Role;
}

export interface ListPrayersResponse {
  items: Array<{
    id: number;
    title: string;
    content: string;
    category: Category;
    status: Status;
    position: number;
    author?: { id: number; name: string };
    createdAt: string; updatedAt: string;
  }>;
  total: number;
}
