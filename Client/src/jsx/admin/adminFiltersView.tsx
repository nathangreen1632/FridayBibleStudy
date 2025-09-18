import React from 'react';

type Props = {
  qInput: string;
  setQInput: (v: string) => void;
  clearSearch: () => void;
  categoryValue: string;
  statusValue: string;
  onCategoryChange: (raw: string) => void;
  onStatusChange: (raw: string) => void;
  CATEGORY_OPTIONS: readonly string[];
  STATUS_OPTIONS: readonly string[];
};

export default function AdminFiltersView(props: Readonly<Props>): React.ReactElement {
  const {
    qInput, setQInput, clearSearch,
    categoryValue, statusValue,
    onCategoryChange, onStatusChange,
    CATEGORY_OPTIONS, STATUS_OPTIONS,
  } = props;

  const showClear = qInput !== '';

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
            onChange={(e) => setQInput(e.currentTarget.value)}
          />
          {showClear ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs
                         text-[var(--theme-placeholder)]/70 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="filters-category" className="block text-sm mb-1">Category</label>
        <select
          id="filters-category"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-[var(--theme-placeholder)]"
          value={categoryValue}
          onChange={(e) => onCategoryChange(e.currentTarget.value)}
        >
          <option value="">Any</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filters-status" className="block text-sm mb-1">Status</label>
        <select
          id="filters-status"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-[var(--theme-placeholder)]"
          value={statusValue}
          onChange={(e) => onStatusChange(e.currentTarget.value)}
        >
          <option value="">Any</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
