import React from 'react';
import { Link } from 'react-router-dom';
import type { AdminPrayerRow, AdminUiSnapshot } from '../../types/admin/admin.types.ts';

type Props = Readonly<{
  rows: AdminPrayerRow[];
  loading: boolean;
  currentPath: string;
  uiSnapshot: AdminUiSnapshot;
  displayStatus: (s: AdminPrayerRow['status']) => string;
}>;

export default function AdminPrayersTableView({
                                                rows,
                                                loading,
                                                currentPath,
                                                uiSnapshot,
                                                displayStatus,
                                              }: Props): React.ReactElement {
  if (loading) {
    return <div className="p-4">Loading…</div>;
  }

  if (!rows || rows.length === 0) {
    return <div className="p-4">No prayers found.</div>;
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
        <tr
          key={r.id}
          className="border-t border-[var(--theme-border)] hover:bg-[var(--theme-card-hover-alt)]"
        >
          <td className="p-3">
            <Link
              to={`/admin/prayers/${r.id}`}
              state={{ from: currentPath, ui: uiSnapshot }}
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
          <td className="p-3 text-center">
            {r.lastCommentAt ? new Date(r.lastCommentAt).toLocaleString() : '—'}
          </td>
        </tr>
      ))}
      </tbody>
    </table>
  );
}
