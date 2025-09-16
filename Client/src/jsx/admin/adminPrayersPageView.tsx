import React from 'react';
import AdminFilters from '../../components/admin/AdminFiltersLogic';
import AdminPrayersTable from '../../components/admin/AdminPrayersTableLogic';
import AdminPager from '../../components/admin/AdminPager';
import type { AdminPrayersPageViewProps } from '../../types/admin/adminPrayersPage.types.ts';

export default function AdminPrayersPageView({
                                               loading,
                                               rows,
                                               total,
                                               page,
                                               pageSize,
                                             }: AdminPrayersPageViewProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <AdminFilters />
      <div className="bg-[var(--theme-surface)] rounded-xl shadow-sm border border-[var(--theme-border)]">
        <AdminPrayersTable loading={loading} rows={rows} />
      </div>
      <AdminPager total={total} page={page} pageSize={pageSize} />
    </div>
  );
}
