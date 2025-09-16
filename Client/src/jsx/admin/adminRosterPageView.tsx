import React from 'react';
import AdminRosterTable from '../../components/admin/AdminRosterTableLogic';
import AdminRosterPager from '../../components/admin/AdminRosterPager';
import type { AdminRosterPageViewProps } from '../../types/admin/adminRosterPage.types.ts';

export default function AdminRosterPageView({
                                              qInput,
                                              onChangeQuery,
                                              onClearQuery,
                                              rows,
                                              sortBy,
                                              sortDir,
                                              onSort,
                                            }: AdminRosterPageViewProps): React.ReactElement {
  return (
    <div className="p-3 space-y-3 mx-auto max-w-full">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="roster-search" className="block text-sm mb-1">Search</label>
          <div className="relative">
            <input
              id="roster-search"
              value={qInput}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Search name, email, city..."
              className="w-full px-3 py-2 pr-20 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
            />
            {qInput !== '' && (
              <button
                type="button"
                onClick={onClearQuery}
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
        rows={rows as any[]} // the table owns the row typing
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
      />

      {/* Pager reads pagination from the store */}
      <AdminRosterPager />
    </div>
  );
}
