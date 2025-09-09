import React from 'react';

type Props = {
  rows: Array<{
    id: number; name: string; email: string; phone: string | null;
    addressStreet: string | null; addressCity: string | null; addressState: string | null; addressZip: string | null;
    spouseName: string | null;
  }>;
  className?: string;
};

export default function AdminRosterTable({ rows, className }: Readonly<Props>): React.ReactElement {
  return (
    <div className={['rounded-xl border', 'border-[var(--theme-border)]', 'bg-[var(--theme-surface)]', className ?? ''].join(' ')}>
      <div className="px-3 py-2 font-semibold border-b border-[var(--theme-border)]">Roster</div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--theme-strip)] text-[var(--theme-strip-text)]">
          <tr>
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-left px-3 py-2">Email</th>
            <th className="text-left px-3 py-2">Phone</th>
            <th className="text-left px-3 py-2">Street</th>
            <th className="text-left px-3 py-2">City</th>
            <th className="text-left px-3 py-2">State</th>
            <th className="text-left px-3 py-2">Zip</th>
            <th className="text-left px-3 py-2">Spouse</th>
          </tr>
          </thead>
          <tbody>
          {rows.map(r => (
            <tr key={r.id} className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]">
              <td className="px-3 py-2">{r.name}</td>
              <td className="px-3 py-2">{r.email}</td>
              <td className="px-3 py-2">{r.phone ?? ''}</td>
              <td className="px-3 py-2">{r.addressStreet ?? ''}</td>
              <td className="px-3 py-2">{r.addressCity ?? ''}</td>
              <td className="px-3 py-2">{r.addressState ?? ''}</td>
              <td className="px-3 py-2">{r.addressZip ?? ''}</td>
              <td className="px-3 py-2">{r.spouseName ?? ''}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="px-3 py-4 opacity-70" colSpan={8}>No members found.</td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
