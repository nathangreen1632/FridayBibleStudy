import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import type { RosterSortField } from '../../stores/admin/useAdminStore';
import AdminRosterPageView from '../../jsx/admin/adminRosterPageView';

type LoadArgs = {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: RosterSortField;
  sortDir?: 'asc' | 'desc';
};

export default function AdminRosterPageLogic(): React.ReactElement {
  const { roster, loadRoster } = useAdminStore();

  const [qInput, setQInput] = useState('');
  const debounceRef = useRef<number | null>(null);

  const [sortBy, setSortBy] = useState<RosterSortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    (async () => {
      try {
        await loadRoster({ page: 1 });
      } catch {
        console.error('Failed to load roster');
        toast.error('Failed to load roster');
      }
    })();
  }, [loadRoster]);

  useEffect(() => {
    const next = qInput.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      (async () => {
        const args: LoadArgs = { q: next, page: 1 };
        if (sortBy) {
          args.sortBy = sortBy;
          args.sortDir = sortDir;
        }
        try {
          await loadRoster(args);
        } catch {
          console.error('Failed to load roster');
          toast.error('Failed to load roster');
        }
      })();
    }, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, sortBy, sortDir, loadRoster]);

  useEffect(() => {
    if (!sortBy) return;
    (async () => {
      try {
        const args: LoadArgs = { q: qInput.trim(), page: 1, sortBy, sortDir };
        await loadRoster(args);
      } catch {
        console.error('Failed to load roster');
        toast.error('Failed to load roster');
      }
    })();
  }, [sortBy, sortDir, qInput, loadRoster]);

  async function clearSearch() {
    setQInput('');
    const args: LoadArgs = { q: '', page: 1 };
    if (sortBy) {
      args.sortBy = sortBy;
      args.sortDir = sortDir;
    }
    try {
      await loadRoster(args);
    } catch {
      console.error('Failed to load roster', roster);
      toast.error('Failed to load roster');
    }
  }

  function handleSort(field: RosterSortField) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  return (
    <AdminRosterPageView
      qInput={qInput}
      onChangeQuery={setQInput}
      onClearQuery={clearSearch}
      rows={roster}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={handleSort}
    />
  );
}
