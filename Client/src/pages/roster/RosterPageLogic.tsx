// Client/src/pages/roster/RosterPageLogic.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import RosterPageView from '../../jsx/roster/rosterPageView.tsx';
import { fetchRoster, type RosterRow } from '../../helpers/api/rosterApi.ts';
import type { LoadArgs, RostersSortField } from '../../types/domain/roster.types.ts';

export default function RosterPageLogic(): React.ReactElement {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [qInput, setQInput] = useState('');
  const [sortBy, setSortBy] = useState<RostersSortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);

  // Track the "latest" request so stale responses don't clobber state
  const reqIdRef = useRef(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Stable loader: DO NOT depend on page/pageSize — always pass them in args
  const load = useCallback(
    async (args: LoadArgs): Promise<void> => {
      const myReqId = ++reqIdRef.current;
      setLoading(true);
      try {
        const res = await fetchRoster({
          q: args.q ?? '',
          page: args.page ?? 1,
          pageSize: args.pageSize ?? pageSize,
          sortBy: args.sortBy ?? undefined,
          sortDir: args.sortDir ?? undefined,
        });

        // Ignore out-of-order responses
        if (myReqId !== reqIdRef.current) return;

        setRows(Array.isArray(res?.data) ? res.data : []);
        if (typeof res?.total === 'number') setTotal(res.total);

        // IMPORTANT: do NOT setPage(res.page) — client controls page
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load roster', args, err);
        toast.error('Failed to load roster');
        setRows([]);
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false);
      }
    },
    [pageSize]
  );

  // Initial load: run once
  useEffect(() => {
    void load({ page: 1, pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search + sort → reset to page 1
  useEffect(() => {
    const nextQ = qInput.trim();
    const timeoutId = window.setTimeout(() => {
      setPage(1); // keep source of truth on client
      void load({
        q: nextQ,
        page: 1,
        pageSize,
        sortBy: sortBy ?? undefined,
        sortDir: sortDir ?? undefined,
      });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [qInput, sortBy, sortDir, pageSize, load]);

  // Page changes (Prev/Next, etc.)
  useEffect(() => {
    void load({
      q: qInput.trim(),
      page,
      pageSize,
      sortBy: sortBy ?? undefined,
      sortDir: sortDir ?? undefined,
    });
  }, [page, qInput, sortBy, sortDir, pageSize, load]);

  async function clearSearch(): Promise<void> {
    setQInput('');
    setPage(1);
    await load({
      q: '',
      page: 1,
      pageSize,
      sortBy: sortBy ?? undefined,
      sortDir: sortDir ?? undefined,
    });
  }

  function onSort(field: RostersSortField): void {
    if (sortBy === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  return (
    <RosterPageView
      rows={rows}
      loading={loading}
      qInput={qInput}
      onChangeQuery={setQInput}
      onClearQuery={() => { void clearSearch(); }}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      page={page}
      total={total}
      pageSize={pageSize}
      totalPages={totalPages}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrev={() => { if (hasPrev) setPage(p => Math.max(1, p - 1)); }}
      onNext={() => { if (hasNext) setPage(p => p + 1); }}
    />
  );
}
