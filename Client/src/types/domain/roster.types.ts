import type { RosterSortField } from '../../stores/admin/useAdminStore.ts'; // reuse your existing union

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
  emailPaused: boolean;
};

export type RosterEditKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'addressStreet'
  | 'addressCity'
  | 'addressState'
  | 'addressZip'
  | 'spouseName';

export type RosterColumnDef = { key: RosterSortField; label: string };

export type RostersSortField =
  | 'name'
  | 'email'
  | 'addressStreet'
  | 'addressCity'
  | 'addressState'
  | 'spouseName';

export type LoadArgs = {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: RosterSortField;
  sortDir?: 'asc' | 'desc';
};
