import type { RosterSortField } from '../../stores/admin/useAdminStore.ts';

export type AdminRosterPageViewProps = Readonly<{
  qInput: string;
  onChangeQuery: (v: string) => void;
  onClearQuery: () => void;
  rows: unknown[];
  sortBy: RosterSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
}>;
