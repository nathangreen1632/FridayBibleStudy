import React, { useEffect, useRef, useState } from 'react';
import AdminRosterTable from '../../components/admin/AdminRosterTable';
import AdminRosterPager from '../../components/admin/AdminRosterPager';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import type { RosterSortField } from '../../stores/admin/useAdminStore'; // ✅ import the union

export default function AdminRosterPage(): React.ReactElement {
  const { roster, loadRoster } = useAdminStore();

  // local input with debounce (mirrors AdminFilters behavior)
  const [qInput, setQInput] = useState('');
  const debounceRef = useRef<number | null>(null);

  // ✅ type these to match the store
  const [sortBy, setSortBy] = useState<RosterSortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // initial load
  useEffect(() => {
    void loadRoster({ page: 1 });
  }, [loadRoster]);

  // Small helper type for clarity (matches store signature)
  type LoadArgs = {
    q?: string;
    page?: number;
    pageSize?: number;
    sortBy?: RosterSortField;
    sortDir?: 'asc' | 'desc';
  };

  // LIVE SEARCH: debounce server calls on input change
  useEffect(() => {
    const next = qInput.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      // reset to page 1 whenever the query changes
      const args: LoadArgs = { q: next, page: 1 };
      if (sortBy) {
        args.sortBy = sortBy;
        args.sortDir = sortDir;
      }
      void loadRoster(args);
    }, 300); // adjust to taste: 200–400ms

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, sortBy, sortDir, loadRoster]);

  // When sort changes, reload with current query
  useEffect(() => {
    if (!sortBy) return;
    const args: LoadArgs = { q: qInput.trim(), page: 1, sortBy, sortDir };
    void loadRoster(args);
  }, [sortBy, sortDir, qInput, loadRoster]);

  function clearSearch() {
    setQInput('');
    // immediate fetch for snappier UX; reset to first page
    const args: LoadArgs = { q: '', page: 1 };
    if (sortBy) {
      args.sortBy = sortBy;
      args.sortDir = sortDir;
    }
    void loadRoster(args);
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

      <AdminRosterTable
        rows={roster}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={(field: RosterSortField) => { // ✅ type callback param
          if (sortBy === field) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setSortBy(field);
            setSortDir('asc');
          }
        }}
      />

      {/* Pager */}
      <AdminRosterPager />
    </div>
  );
}
