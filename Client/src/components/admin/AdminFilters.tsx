// Client/src/components/admin/AdminFilters.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import { useSocketStore } from '../../stores/useSocketStore';

const CATEGORY_OPTIONS = ['birth', 'long-term', 'praise', 'prayer', 'pregnancy', 'salvation'] as const;
type Category = typeof CATEGORY_OPTIONS[number];

const STATUS_OPTIONS = ['active', 'praise', 'archived'] as const;
type Status = typeof STATUS_OPTIONS[number];

function isCategory(v: string): v is Category {
  return (CATEGORY_OPTIONS as readonly string[]).includes(v);
}
function isStatus(v: string): v is Status {
  return (STATUS_OPTIONS as readonly string[]).includes(v);
}

const FALLBACK_EVT = 'admin:filters:patch';
function emitFallback(
  patch: Partial<{ q: string; category: Category | undefined; status: Status | undefined; page: number }>
) {
  try {
    window.dispatchEvent(new CustomEvent(FALLBACK_EVT, { detail: patch }));
  } catch {}
}

export default function AdminFilters(): React.ReactElement {
  const ui = useAdminUiStore();
  const { socket, joinGroup, leaveGroup } = useSocketStore();

  // ✅ Join once per groupId only (DON'T depend on joinGroup/leaveGroup function identities)
  useEffect(() => {
    const gid = typeof ui.groupId === 'number' ? ui.groupId : 1;
    try { joinGroup(gid); } catch {}
    return () => {
      try { leaveGroup(gid); } catch {}
    };
    // ⚠️ Only run when the numeric group id changes
  }, [ui.groupId]);

  // Also re-join after socket reconnects (belt & suspenders; harmless if already in)
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      const gid = typeof ui.groupId === 'number' ? ui.groupId : 1;
      try { joinGroup(gid); } catch {}
    };
    try { socket.on('connect', onConnect); } catch {}
    return () => {
      try { socket.off?.('connect', onConnect); } catch {}
    };
  }, [socket, ui.groupId, joinGroup]);

  const [qInput, setQInput] = useState(ui.q ?? '');
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setQInput(ui.q ?? '');
  }, [ui.q]);

  // Debounce search → don't include socket in deps (keeps timer stable)
  useEffect(() => {
    const next = qInput.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      if (ui.q !== next) {
        const patch = { q: next, page: 1 };
        ui.set(patch);
        try {
          if (socket?.emit) socket.emit('admin:filters:patch', patch);
          else emitFallback(patch);
        } catch {
          emitFallback(patch);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, ui /* ← no socket here */]);

  function clearSearch() {
    setQInput('');
    const patch = { q: '', page: 1 };
    ui.set(patch);
    try {
      if (socket?.emit) socket.emit('admin:filters:patch', patch);
      else emitFallback(patch);
    } catch {
      emitFallback(patch);
    }
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    let next: Category | undefined;

    if (raw === '') {
      next = undefined;
    } else if (isCategory(raw)) {
      next = raw;
    } else {
      next = undefined;
    }

    const patch = { category: next, page: 1 };
    ui.set(patch);

    try {
      if (socket?.emit) socket.emit('admin:filters:patch', patch);
      else emitFallback(patch);
    } catch {
      emitFallback(patch);
    }
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    let next: Status | undefined;

    if (raw === '') {
      next = undefined;
    } else if (isStatus(raw)) {
      next = raw;
    } else {
      next = undefined;
    }

    const patch = { status: next, page: 1 };
    ui.set(patch);

    try {
      if (socket?.emit) socket.emit('admin:filters:patch', patch);
      else emitFallback(patch);
    } catch {
      emitFallback(patch);
    }
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
          onChange={handleCategoryChange}
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
          value={ui.status ?? ''}
          onChange={handleStatusChange}
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
