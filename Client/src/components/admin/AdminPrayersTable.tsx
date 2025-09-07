// Client/src/components/admin/AdminPrayersTable.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import type { AdminPrayerRow } from '../../types/admin.types.ts';

export default function AdminPrayersTable({ rows, loading }: Readonly<{ rows: AdminPrayerRow[]; loading: boolean }>): React.ReactElement {
  if (loading) return <div className="p-4">Loading…</div>;
  if (!rows?.length) return <div className="p-4">No prayers found.</div>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-[var(--theme-card)]">
      <tr>
        <th className="text-left p-3">Title</th>
        <th className="text-left p-3">Group</th>
        <th className="text-left p-3">Category</th>
        <th className="text-left p-3">Status</th>
        <th className="text-left p-3">Comments</th>
        <th className="text-left p-3">Last Update</th>
      </tr>
      </thead>
      <tbody>
      {rows.map((r) => (
        <tr key={r.id} className="border-t border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]">
          <td className="p-3">
            <Link to={`/admin/prayers/${r.id}`} className="text-[var(--theme-link)] hover:text-[var(--theme-link-hover)] underline">
              {r.title}
            </Link>
            <div className="text-xs opacity-80">by {r.authorName}</div>
          </td>
          <td className="p-3">{r.groupName}</td>
          <td className="p-3">{r.category}</td>
          <td className="p-3">{r.status === 'active' ? 'prayer' : r.status}</td>
          <td className="p-3">{r.commentCount ?? 0}</td>
          <td className="p-3">{r.lastCommentAt ? new Date(r.lastCommentAt).toLocaleString() : '—'}</td>
        </tr>
      ))}
      </tbody>
    </table>
  );
}
