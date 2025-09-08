// Client/src/components/admin/AdminPrayersTable.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AdminPrayerRow } from '../../types/admin.types.ts';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';

export default function AdminPrayersTable(
  { rows, loading }: Readonly<{ rows: AdminPrayerRow[]; loading: boolean }>
): React.ReactElement {
  const ui = useAdminUiStore();
  const loc = useLocation();

  if (loading) return <div className="p-4">Loading…</div>;
  if (!rows?.length) return <div className="p-4">No prayers found.</div>;

  const uiSnapshot = {
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
    <table className="w-full text-sm">
      <thead className="bg-[var(--theme-card)]">
      <tr>
        <th className="text-left p-3">Title</th>
        <th className="text-center p-3">Group</th>
        <th className="text-center p-3">Category</th>
        <th className="text-center p-3">Status</th>
        <th className="text-center p-3">Comments</th>
        <th className="text-center p-3">Last Update</th>
      </tr>
      </thead>
      <tbody>
      {rows.map((r) => (
        <tr key={r.id} className="border-t border-[var(--theme-border)] hover:bg-[var(--theme-card-hover-alt)]">
          <td className="p-3">
            <Link
              to={`/admin/prayers/${r.id}`}
              state={{ from: loc.pathname, ui: uiSnapshot }}
              className="text-[var(--theme-link)] hover:text-[var(--theme-link-hover)] underline"
            >
              {r.title}
            </Link>
            <div className="text-xs opacity-80">by {r.authorName}</div>
          </td>
          <td className="p-3 text-center">{r.groupName}</td>
          <td className="p-3 text-center">{r.category}</td>
          <td className="p-3 text-center">{displayStatus(r.status)}</td>
          <td className="p-3 text-center">{r.commentCount ?? 0}</td>
          <td className="p-3 text-center">{r.lastCommentAt ? new Date(r.lastCommentAt).toLocaleString() : '—'}</td>
        </tr>
      ))}
      </tbody>
    </table>
  );
}
