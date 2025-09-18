import React, { useEffect } from 'react';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import AdminPrayersPageView from '../../jsx/admin/adminPrayersPageView';

export default function AdminPrayersPageLogic(): React.ReactElement {
  const { loadList, loading, list, total, page, pageSize } = useAdminStore();
  const ui = useAdminUiStore();

  useEffect(() => {
    (async () => {
      try {
        await loadList({
          q: ui.q,
          groupId: ui.groupId,
          status: ui.status,
          category: ui.category,
          page: ui.page,
          pageSize: ui.pageSize,
        });
      } catch {
        console.error('Failed to load prayers', loading);
      }
    })();
  }, [loadList, ui.q, ui.groupId, ui.status, ui.category, ui.page, ui.pageSize]);

  return (
    <AdminPrayersPageView
      loading={loading}
      rows={list}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  );
}
