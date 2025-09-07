// Client/src/components/admin/AdminFilters.tsx
import React, { useState } from 'react';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';

export default function AdminFilters(): React.ReactElement {
  const ui = useAdminUiStore();
  const [qInput, setQInput] = useState(ui.q ?? '');

  function applySearch() {
    ui.set({ q: qInput, page: 1 });
  }

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
      <div className="flex-1">
        <label htmlFor="filters-search" className="block text-sm mb-1">
          Search
        </label>
        <input
          id="filters-search"
          className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]"
          placeholder="Title or content…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="filters-status" className="block text-sm mb-1">
          Status
        </label>
        <select
          id="filters-status"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-[var(--theme-placeholder)]"
          value={ui.status ?? ''}
          onChange={(e) =>
            ui.set({ status: e.target.value ? (e.target.value as any) : undefined, page: 1 })
          }
        >
          <option value="">Any</option>
          <option value="active">Active</option>
          <option value="praise">Praise</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div>
        <label htmlFor="filters-category" className="block text-sm mb-1">
          Category
        </label>
        <select
          id="filters-category"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-[var(--theme-placeholder)]"
          value={ui.category ?? ''}
          onChange={(e) =>
            ui.set({ category: e.target.value ? (e.target.value as any) : undefined, page: 1 })
          }
        >
          <option value="">Any</option>
          <option value="birth">Birth</option>
          <option value="long-term">Long-term</option>
          <option value="praise">Praise</option>
          <option value="prayer">Prayer</option>
          <option value="pregnancy">Pregnancy</option>
          <option value="salvation">Salvation</option>
        </select>
      </div>
      <button
        type="button"
        onClick={applySearch}
        className="rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
      >
        Apply
      </button>
    </div>
  );
}
