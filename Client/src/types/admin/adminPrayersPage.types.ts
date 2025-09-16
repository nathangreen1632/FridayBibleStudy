import type { AdminPrayerRow } from './admin.types.ts';

export type AdminPrayersPageViewProps = Readonly<{
  loading: boolean;
  rows: AdminPrayerRow[];
  total: number;
  page: number;
  pageSize: number;
}>;
