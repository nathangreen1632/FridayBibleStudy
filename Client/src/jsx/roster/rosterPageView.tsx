// Client/src/jsx/rosterPageView.tsx
import React from 'react';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import type { RosterRow } from '../../helpers/api/rosterApi.ts';
import type { RostersSortField } from '../../types/domain/roster.types.ts';

type SortThProps = Readonly<{
  label: string;
  field: RostersSortField;
  activeField: RostersSortField | null;
  direction: 'asc' | 'desc';
  onSort: (field: RostersSortField) => void;
}>;

function SortTh({
                  label,
                  field,
                  activeField,
                  direction,
                  onSort,
                }: SortThProps): React.ReactElement {
  const isActive = activeField === field;

  let icon: React.ReactElement | null = null;
  if (isActive && direction === 'asc') {
    icon = (
      <ArrowUpAZ
        className="w-5 h-5 text-[var(--theme-button-hover)] ml-auto"
        aria-hidden="true"
      />
    );
  } else if (isActive && direction === 'desc') {
    icon = (
      <ArrowDownAZ
        className="w-5 h-5 text-[var(--theme-pill-orange)] ml-auto"
        aria-hidden="true"
      />
    );
  }

  let ariaSort: 'none' | 'ascending' | 'descending' = 'none';
  if (isActive) ariaSort = direction === 'asc' ? 'ascending' : 'descending';

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className="text-left px-3 py-2 border-t-2 border-b-2 border-[var(--theme-border)] bg-[var(--theme-button-blue)] text-[var(--theme-moveto)] cursor-pointer select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-between w-full">
        <span>{label}</span>
        {icon}
      </div>
    </th>
  );
}

type Props = {
  // data
  rows: RosterRow[];
  loading: boolean;

  // search
  qInput: string;
  onChangeQuery: (v: string) => void;
  onClearQuery: () => void;

  // sorting
  sortBy: RostersSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RostersSortField) => void;

  // paging
  page: number;
  total: number;
  pageSize: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function RosterPageView({
                                         rows,
                                         loading,
                                         qInput,
                                         onChangeQuery,
                                         onClearQuery,
                                         sortBy,
                                         sortDir,
                                         onSort,
                                         page,
                                         total,
                                         pageSize,
                                         totalPages,
                                         hasPrev,
                                         hasNext,
                                         onPrev,
                                         onNext,
                                       }: Readonly<Props>): React.ReactElement {
  // table body
  let bodyRows: React.ReactNode;
  if (loading) {
    bodyRows = (
      <tr>
        <td colSpan={7} className="px-3 py-4 opacity-70">
          Loading…
        </td>
      </tr>
    );
  } else if (!rows || rows.length === 0) {
    bodyRows = (
      <tr>
        <td colSpan={7} className="px-3 py-4 opacity-70">
          No members found.
        </td>
      </tr>
    );
  } else {
    bodyRows = rows.map((r) => (
      <tr
        key={r.id}
        className="even:bg-[var(--theme-card-alt-inverse)] text-[var(--theme-moveto)] hover:bg-[var(--theme-card-hover)]"
      >
        <td className="px-3 py-2">{r.name}</td>
        <td className="px-3 py-2">
          <a
            href={`mailto:${r.email}`}
            className="underline text-[var(--theme-moveto)] hover:text-[var(--theme-link-hover)]"
          >
            {r.email}
          </a>
        </td>
        <td className="px-3 py-2">{r.phone ?? ''}</td>
        <td className="px-3 py-2">{r.addressStreet ?? ''}</td>
        <td className="px-3 py-2">{r.addressCity ?? ''}</td>
        <td className="px-3 py-2">{r.addressState ?? ''}</td>
        <td className="px-3 py-2">{r.spouseName ?? ''}</td>
      </tr>
    ));
  }

  return (
    <div className="p-3 space-y-3 mx-auto max-w-full">
      {/* Search */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="roster-search" className="block text-sm mb-1">
            Search
          </label>
          <div className="relative">
            <input
              id="roster-search"
              value={qInput}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Search name, email, street, city..."
              className="w-full px-3 py-2 pr-20 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
            />
            {qInput !== '' ? (
              <button
                type="button"
                onClick={onClearQuery}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md text-sm
                           text-[var(--theme-placeholder)]/70 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-t-xl border border-[var(--theme-border)] bg-[var(--theme-accent)]">
        <div className="px-3 py-2 text-[var(--theme-moveto)] font-semibold flex items-center justify-between">
          <span>Roster</span>
          <span className="text-xs opacity-70">
            Page {page} • {Math.min(total, (page - 1) * pageSize + 1)}–
            {Math.min(total, page * pageSize)} of {total}
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--theme-strip)] text-[var(--theme-strip-text)]">
            <tr>
              <SortTh
                label="Name"
                field="name"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortTh
                label="Email"
                field="email"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <th className="text-left px-3 py-2 border-t-2 border-b-2 border-[var(--theme-border)] text-[var(--theme-moveto)] bg-[var(--theme-button-blue)]">
                Phone
              </th>
              <SortTh
                label="Street"
                field="addressStreet"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortTh
                label="City"
                field="addressCity"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortTh
                label="State"
                field="addressState"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortTh
                label="Spouse"
                field="spouseName"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
            </tr>
            </thead>

            <tbody>{bodyRows}</tbody>
          </table>
        </div>
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-card-hover)]"
          disabled={!hasPrev}
        >
          Prev
        </button>
        <div className="opacity-80 text-sm">
          Page {page} of {totalPages}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-card-hover)]"
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
