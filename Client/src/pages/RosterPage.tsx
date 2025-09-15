// Client/src/pages/RosterPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { fetchRoster, type RosterRow } from '../helpers/api/rosterApi';

export type RosterSortField =
  | 'name'
  | 'email'
  | 'addressStreet'
  | 'addressCity'
  | 'addressState'
  | 'spouseName';

type LoadArgs = {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: RosterSortField;
  sortDir?: 'asc' | 'desc';
};

type SortThProps = Readonly<{
  label: string;
  field: RosterSortField;
  activeField: RosterSortField | null;
  direction: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
}>;

/* ───────────────── Admin-like sortable header ───────────────── */
function SortTh({ label, field, activeField, direction, onSort }: SortThProps): React.ReactElement {
  const isActive = activeField === field;

  let icon: React.ReactElement | null = null;
  if (isActive && direction === 'asc') {
    icon = <ArrowUpAZ className="w-5 h-5 text-[var(--theme-button-hover)] ml-auto" aria-hidden="true" />;
  } else if (isActive && direction === 'desc') {
    icon = <ArrowDownAZ className="w-5 h-5 text-[var(--theme-pill-orange)] ml-auto" aria-hidden="true" />;
  }

  let ariaSort: 'none' | 'ascending' | 'descending' = 'none';
  if (isActive) {
    ariaSort = direction === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className="text-left px-3 py-2 border-t-2 border-b-2 border-[var(--theme-border)] cursor-pointer select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-between w-full">
        <span>{label}</span>
        {icon}
      </div>
    </th>
  );
}

export default function RosterPage(): React.ReactElement {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [qInput, setQInput] = useState('');
  const debounceRef = useRef<number | null>(null);

  const [sortBy, setSortBy] = useState<RosterSortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => { void load({ page: 1 }); /* initial */ }, []);

  // Debounced live search (mirror admin)
  useEffect(() => {
    const next = qInput.trim();
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = window.setTimeout(() => {
      const args: LoadArgs = { q: next, page: 1 };
      if (sortBy) { args.sortBy = sortBy; args.sortDir = sortDir; }
      void load(args);
    }, 300);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paging uses current filters
  useEffect(() => {
    const args: LoadArgs = { q: qInput.trim(), page, pageSize };
    if (sortBy) { args.sortBy = sortBy; args.sortDir = sortDir; }
    void load(args);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load(args: LoadArgs): Promise<void> {
    setLoading(true);
    try {
      const res = await fetchRoster({
        q: args.q,
        page: args.page ?? page,
        pageSize: args.pageSize ?? pageSize,
        sortBy: args.sortBy ?? undefined,
        sortDir: args.sortDir ?? undefined,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      if (typeof res?.total === 'number') setTotal(res.total);
      if (typeof res?.page === 'number') setPage(res.page);
    } catch {
      console.error('Failed to load roster');
      toast.error('Failed to load roster');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function clearSearch(): Promise<void> {
    setQInput('');
    const args: LoadArgs = { q: '', page: 1 };
    if (sortBy) { args.sortBy = sortBy; args.sortDir = sortDir; }
    await load(args);
  }

  /* Admin-like table body: alternating rows + hover highlight */
  let bodyRows: React.ReactNode;
  if (loading) {
    bodyRows = (
      <tr>
        <td colSpan={7} className="px-3 py-4 opacity-70">Loading…</td>
      </tr>
    );
  } else if (!rows || rows.length === 0) {
    bodyRows = (
      <tr>
        <td colSpan={7} className="px-3 py-4 opacity-70">No members found.</td>
      </tr>
    );
  } else {
    bodyRows = rows.map((r) => (
      <tr key={r.id} className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]">
        <td className="px-3 py-2">{r.name}</td>
        <td className="px-3 py-2">
          <a
            href={`mailto:${r.email}`}
            className="underline text-[var(--theme-strip-text)] hover:text-[var(--theme-link-hover)]"
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

  function onSort(field: RosterSortField): void {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  // Derived for pager
  const hasPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasNext = page < totalPages;

  return (
    <div className="p-3 space-y-3 mx-auto max-w-full">
      {/* Search (same block as admin) */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="roster-search" className="block text-sm mb-1">Search</label>
          <div className="relative">
            <input
              id="roster-search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search name, email, street, city..."
              className="w-full px-3 py-2 pr-20 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
            />
            {qInput !== '' ? (
              <button
                type="button"
                onClick={() => { void clearSearch(); }}
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

      {/* ───────────── Card wrapper + header (mirror admin) ───────────── */}
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <div className="px-3 py-2 font-semibold flex items-center justify-between">
          <span>Roster</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--theme-strip)] text-[var(--theme-strip-text)]">
            <tr>
              <SortTh label="Name" field="name" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortTh label="Email" field="email" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <th className="text-left px-3 py-2 border-t-2 border-b-2 border-[var(--theme-border)]">Phone</th>
              <SortTh label="Street" field="addressStreet" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortTh label="City" field="addressCity" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortTh label="State" field="addressState" activeField={sortBy} direction={sortDir} onSort={onSort} />
              <SortTh label="Spouse" field="spouseName" activeField={sortBy} direction={sortDir} onSort={onSort} />
            </tr>
            </thead>

            <tbody>{bodyRows}</tbody>
          </table>
        </div>
      </div>

      {/* Pager (same placement/feel as AdminRosterPager) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => { if (hasPrev) setPage((p) => Math.max(1, p - 1)); }}
          className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-card-hover)]"
          disabled={!hasPrev}
        >
          Prev
        </button>
        <div className="opacity-80 text-sm">Page {page} of {totalPages}</div>
        <button
          type="button"
          onClick={() => { if (hasNext) setPage((p) => p + 1); }}
          className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-card-hover)]"
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
