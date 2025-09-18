import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const load = useCallback(
    async (args: LoadArgs): Promise<void> => {
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
        console.error('Failed to load roster', args);
        toast.error('Failed to load roster');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    (async () => {
      await load({ page: 1 });
    })();
  }, [load]);

  useEffect(() => {
    const next = qInput.trim();
    const id = window.setTimeout(() => {
      (async () => {
        const args: LoadArgs = { q: next, page: 1 };
        if (sortBy) {
          args.sortBy = sortBy;
          args.sortDir = sortDir;
        }
        await load(args);
      })();
    }, 300);

    return () => window.clearTimeout(id);
  }, [qInput, sortBy, sortDir, load]);

  useEffect(() => {
    (async () => {
      const args: LoadArgs = {
        q: qInput.trim(),
        page,
        pageSize,
        sortBy: sortBy ?? undefined,
        sortDir: sortDir ?? undefined,
      };
      await load(args);
    })();
  }, [page]);

  async function clearSearch(): Promise<void> {
    setQInput('');
    setPage(1);
    const args: LoadArgs = {
      q: '',
      page: 1,
      sortBy: sortBy ?? undefined,
      sortDir: sortDir ?? undefined,
    };
    await load(args);
  }

  function onSort(field: RostersSortField): void {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
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
      onClearQuery={() => {
        void clearSearch();
      }}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      page={page}
      total={total}
      pageSize={pageSize}
      totalPages={totalPages}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrev={() => {
        if (hasPrev) setPage((p) => Math.max(1, p - 1));
      }}
      onNext={() => {
        if (hasNext) setPage((p) => p + 1);
      }}
    />
  );
}
