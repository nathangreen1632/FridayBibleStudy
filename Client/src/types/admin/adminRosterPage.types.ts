import type { RosterSortField } from '../../stores/admin/useAdminStore.ts';

export type AdminRosterPageViewProps = Readonly<{
  qInput: string;
  onChangeQuery: (v: string) => void;
  onClearQuery: () => void;

  // Table props (view just passes these through)
  rows: unknown[]; // the table component owns the row typing
  sortBy: RosterSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
}>;
