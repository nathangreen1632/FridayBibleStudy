// Client/src/components/admin/AdminPager.tsx
import React from 'react';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';

export default function AdminPager({ total, page, pageSize }: Readonly<{
  total: number;
  page: number;
  pageSize: number
}>): React.ReactElement {
  const ui = useAdminUiStore();
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

  function prev() {
    if (page > 1) ui.set({ page: page - 1 });
  }
  function next() {
    if (page < totalPages) ui.set({ page: page + 1 });
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <div>Total: {total}</div>
      <div className="flex gap-2">
        <button onClick={prev} className="rounded-lg border px-3 py-1 hover:bg-[var(--theme-button-hover)]" disabled={page <= 1}>Prev</button>
        <div>Page {page} / {totalPages}</div>
        <button onClick={next} className="rounded-lg border px-3 py-1 hover:bg-[var(--theme-button-hover)]" disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
}
