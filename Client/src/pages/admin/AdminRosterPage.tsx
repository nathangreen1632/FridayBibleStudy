// Client/src/pages/admin/AdminRosterPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import AdminRosterTable from '../../components/admin/AdminRosterTable';
import { useAdminStore } from '../../stores/admin/useAdminStore';

export default function AdminRosterPage(): React.ReactElement {
  const { roster, loadRoster } = useAdminStore();

  // local input with debounce (mirrors AdminFilters behavior)
  const [qInput, setQInput] = useState('');
  const debounceRef = useRef<number | null>(null);

  // initial load
  useEffect(() => {
    void loadRoster({});
  }, [loadRoster]);

  // LIVE SEARCH: debounce server calls on input change
  useEffect(() => {
    const next = qInput.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      void loadRoster({ q: next });
    }, 300); // adjust to taste: 200–400ms

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, loadRoster]);

  function clearSearch() {
    setQInput('');
    // immediate fetch for snappier UX
    void loadRoster({ q: '' });
  }

  return (
    <div className="p-3 space-y-3 mx-auto max-w-full">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="roster-search" className="block text-sm mb-1">Search</label>
          <div className="relative">
            <input
              id="roster-search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search name, email, city..."
              className="w-full px-3 py-2 pr-20 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
            />
            {qInput !== '' && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md text-sm
                           text-[var(--theme-placeholder)]/70 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <AdminRosterTable rows={roster} />
    </div>
  );
}
