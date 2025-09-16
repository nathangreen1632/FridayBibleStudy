import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import AdminPrayersTableView from '../../jsx/admin/adminPrayersTableView';
import type { AdminPrayerRow, AdminUiSnapshot } from '../../types/admin/admin.types.ts';

type Props = Readonly<{
  rows: AdminPrayerRow[];
  loading: boolean;
}>;

/**
 * Owns all non-render logic and passes plain props to the View.
 */
export default function AdminPrayersTableLogic({ rows, loading }: Props): React.ReactElement {
  const ui = useAdminUiStore();
  const loc = useLocation();

  const uiSnapshot: AdminUiSnapshot = {
    q: ui.q ?? '',
    status: ui.status,
    category: ui.category,
    page: ui.page,
    pageSize: ui.pageSize,
  };

  function displayStatus(s: AdminPrayerRow['status']): string {
    if (s === 'active') return 'prayer';
    return s;
  }

  return (
    <AdminPrayersTableView
      rows={rows}
      loading={loading}
      currentPath={loc.pathname}
      uiSnapshot={uiSnapshot}
      displayStatus={displayStatus}
    />
  );
}
