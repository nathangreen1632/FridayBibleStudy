// Client/src/components/admin/AdminFilters.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';

export default function AdminFilters(): React.ReactElement {
  const ui = useAdminUiStore();

  // local input mirrors the store, but we debounce writes to the store
  const [qInput, setQInput] = useState(ui.q ?? '');
  const debounceRef = useRef<number | null>(null);

  // keep local box in sync if something else updates ui.q (e.g., "Clear filters")
  useEffect(() => {
    setQInput(ui.q ?? '');
  }, [ui.q]);

  // LIVE SEARCH: debounce pushing q to the store
  useEffect(() => {
    // trim but allow empty string (clears filter)
    const next = qInput.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      // avoid useless store writes
      if (ui.q !== next) {
        ui.set({ q: next, page: 1 });
      }
    }, 300); // adjust to taste (200–400ms feels good)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, ui]);

  function clearSearch() {
    setQInput('');
    // immediate clear for good UX
    ui.set({ q: '', page: 1 });
  }

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
      <div className="flex-1">
        <label htmlFor="filters-search" className="block text-sm mb-1">Search</label>
        <div className="relative">
          <input
            id="filters-search"
            className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 pr-9 placeholder:text-[var(--theme-placeholder)]"
            placeholder="Title or content…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
          {qInput !== '' && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs
                         text-[var(--theme-placeholder)]/70 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="filters-category" className="block text-sm mb-1">Category</label>
        <select
          id="filters-category"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-[var(--theme-placeholder)]"
          value={ui.category ?? ''}
          onChange={(e) => ui.set({ category: e.target.value ? (e.target.value as any) : undefined, page: 1 })}
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

      <div>
        <label htmlFor="filters-status" className="block text-sm mb-1">Status</label>
        <select
          id="filters-status"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-[var(--theme-placeholder)]"
          value={ui.status ?? ''}
          onChange={(e) => ui.set({ status: e.target.value ? (e.target.value as any) : undefined, page: 1 })}
        >
          <option value="">Any</option>
          <option value="active">Prayer</option>
          <option value="praise">Praise</option>
          <option value="archived">Archived</option>
        </select>
      </div>


    </div>
  );
}
