// Client/src/pages/admin/AdminPrayersPage.tsx
import React, { useEffect } from 'react';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import AdminFilters from '../../components/admin/AdminFilters';
import AdminPrayersTable from '../../components/admin/AdminPrayersTable';
import AdminPager from '../../components/admin/AdminPager';

export default function AdminPrayersPage(): React.ReactElement {
  const { loadList, loading, list, total, page, pageSize } = useAdminStore();
  const ui = useAdminUiStore();

  useEffect(() => {
    loadList({ q: ui.q, groupId: ui.groupId, status: ui.status, category: ui.category, page: ui.page, pageSize: ui.pageSize });
  }, [ui.q, ui.groupId, ui.status, ui.category, ui.page, ui.pageSize]);

  return (
    <div className="space-y-4">
      <AdminFilters />
      <div className="bg-[var(--theme-surface)] rounded-xl shadow-sm border border-[var(--theme-border)]">
        <AdminPrayersTable loading={loading} rows={list} />
      </div>
      <AdminPager total={total} page={page} pageSize={pageSize} />
    </div>
  );
}
