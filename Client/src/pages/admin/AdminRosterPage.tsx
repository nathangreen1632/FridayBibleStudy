import React, { useEffect, useState } from 'react';
import AdminRosterTable from '../../components/admin/AdminRosterTable';
import { useAdminStore } from '../../stores/admin/useAdminStore';

export default function AdminRosterPage(): React.ReactElement {
  const { roster, loadRoster } = useAdminStore();
  const [q, setQ] = useState('');

  useEffect(() => { void loadRoster({}); }, [loadRoster]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    await loadRoster({ q });
  }

  return (
    <div className="p-3 space-y-3">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name, email, city..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] placeholder-[var(--theme-placeholder)]"
        />
        <button className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)]">Search</button>
      </form>
      <AdminRosterTable rows={roster} />
    </div>
  );
}
