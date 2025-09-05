// Client/src/components/MyPrayersColumn.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMyPrayersStore } from '../stores/useMyPrayersStore';
import type { Category, Prayer, Status } from '../types/domain.types';

// Client/src/components/MyPrayersColumn.tsx (replace only StatusPill)
function StatusPill({ s }: Readonly<{ s: Status }>) {
  let label: string;
  let colorClass: string;

  switch (s) {
    case 'active':
      // “Prayer” column (active) => Yellow
      label = 'Prayer';
      colorClass = 'bg-yellow-400 text-black';
      break;
    case 'praise':
      // Praise => Green
      label = 'Praise';
      colorClass = 'bg-green-500 text-white';
      break;
    case 'archived':
      // Archived => #ef4444
      label = 'Archived';
      colorClass = 'bg-[#ef4444] text-white';
      break;
    default:
      // Safe fallback uses your theme card color
      label = 'Active';
      colorClass = 'bg-[var(--theme-card)] text-[var(--theme-text)]';
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-[var(--theme-border)]',
        colorClass,
      ].join(' ')}
    >
      {label}
    </span>
  );
}


function RowActions(props: Readonly<{
  p: Prayer;
  onEdit: () => void;
  onSave: (patch: Partial<Pick<Prayer, 'title' | 'content' | 'category'>>) => void;
  onMove: (to: Status) => void;
  onDelete: () => void;
  saving: boolean;
}>) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        type="button"
        onClick={props.onEdit}
        className="px-2 py-1 rounded-md bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)]"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => props.onSave({})}
        disabled={props.saving}
        className="px-2 py-1 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] disabled:opacity-60"
      >
        Save
      </button>
      <div className="inline-flex items-center gap-1">
        <span className="text-xs opacity-70">Move:</span>
        <button type="button" onClick={() => props.onMove('active')} className="px-2 py-1 rounded bg-[var(--theme-card)] hover:bg-[var(--theme-card-hover)]">Prayer</button>
        <button type="button" onClick={() => props.onMove('praise')} className="px-2 py-1 rounded bg-[var(--theme-card)] hover:bg-[var(--theme-card-hover)]">Praise</button>
        <button type="button" onClick={() => props.onMove('archived')} className="px-2 py-1 rounded bg-[var(--theme-card)] hover:bg-[var(--theme-card-hover)]">Archive</button>
      </div>
      <button
        type="button"
        onClick={props.onDelete}
        className="px-2 py-1 rounded-md bg-[var(--theme-error)] text-white"
      >
        Delete
      </button>
    </div>
  );
}

export default function MyPrayersColumn(): React.ReactElement {
  // Remove unused bindings (sort, dir, setCategory, setSort, setDir) to fix TS6133
  const {
    byId, ids, loading, error,
    q, status, category,
    setQuery, setStatus,
    fetchInitial, save, moveTo, remove
  } = useMyPrayersStore();

  const [editing, setEditing] = useState<Record<number, { title: string; content: string; category: Category }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => { void fetchInitial(); }, [fetchInitial]);

  const items = useMemo(() => {
    const all = ids.map((id) => byId.get(id)).filter(Boolean) as Prayer[];
    return all.filter((p) => {
      let ok = true;
      if (status !== 'all') ok = ok && p.status === status;
      if (category) ok = ok && p.category === category;
      if (q) {
        const needle = q.toLowerCase();
        const inTitle = p.title.toLowerCase().includes(needle);
        const inContent = p.content.toLowerCase().includes(needle);
        const inAuthor = p.author?.name?.toLowerCase().includes(needle) ?? false;
        ok = ok && (inTitle || inContent || inAuthor);
      }
      return ok;
    });
  }, [ids, byId, q, status, category]);

  function startEdit(p: Prayer) {
    const cur = editing[p.id];
    if (cur) return;
    const next = { ...editing };
    next[p.id] = { title: p.title, content: p.content, category: p.category };
    setEditing(next);
  }

  async function onSave(id: number) {
    const cur = editing[id];
    if (!cur) return;
    setSavingId(id);
    const ok = await save(id, { title: cur.title, content: cur.content, category: cur.category });
    setSavingId(null);
    if (!ok) return;
    const next = { ...editing };
    delete next[id];
    setEditing(next);
  }

  async function onMove(id: number, to: Status) {
    setSavingId(id);
    const ok = await moveTo(id, to);
    setSavingId(null);
    if (!ok) return;
  }

  async function onDelete(id: number) {
    const ok = await remove(id);
    if (!ok) return;
    const next = { ...editing };
    delete next[id];
    setEditing(next);
  }

  // Strongly-typed change handler (no `any`)
  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as 'all' | Status;
    setStatus(next);
  }

  return (
    <section
      aria-label="My Prayers"
      className="mt-8 rounded-2xl bg-[var(--theme-surface)]/80 border border-[var(--theme-border)] shadow-md p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--theme-text)]">My Prayers</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search my prayers…"
            className="px-3 py-2 rounded-lg bg-[var(--theme-textbox)] text-[var(--theme-text)] border border-[var(--theme-border)]"
          />
          <select
            value={status}
            onChange={onStatusChange}
            className="px-2 py-2 rounded-lg bg-[var(--theme-card)] text-[var(--theme-text)] border border-[var(--theme-border)]"
          >
            <option value="all">All</option>
            <option value="active">Prayer</option>
            <option value="praise">Praise</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </header>

      {loading && <p className="mt-4 opacity-70">Loading…</p>}
      {!loading && error && <p className="mt-4 text-[var(--theme-error)]">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="mt-4 opacity-70">No prayers yet.</p>}

      <ul className="mt-4 space-y-3">
        {items.map((p) => {
          const ed = editing[p.id];

          const onField = (field: 'title' | 'content' | 'category', value: string) => {
            const base = ed ?? { title: p.title, content: p.content, category: p.category };
            const next = { ...editing };
            if (field === 'title') {
              next[p.id] = { ...base, title: value };
            } else if (field === 'content') {
              next[p.id] = { ...base, content: value };
            } else {
              next[p.id] = { ...base, category: value as Category };
            }
            setEditing(next);
          };

          return (
            <li key={p.id} className="rounded-xl bg-[var(--theme-card)] p-3 border border-[var(--theme-border)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusPill s={p.status} />
                    <span className="text-xs opacity-70">{new Date(p.updatedAt).toLocaleString()}</span>
                  </div>

                  {ed ? (
                    <>
                      <input
                        value={ed.title}
                        onChange={(e) => onField('title', e.target.value)}
                        className="mt-2 w-full px-3 py-2 rounded bg-[var(--theme-textbox)] border border-[var(--theme-border)]"
                      />
                      <textarea
                        value={ed.content}
                        onChange={(e) => onField('content', e.target.value)}
                        className="mt-2 w-full px-3 py-2 rounded bg-[var(--theme-textbox)] border border-[var(--theme-border)]"
                      />
                      <select
                        value={ed.category}
                        onChange={(e) => onField('category', e.target.value)}
                        className="mt-2 w-full px-3 py-2 rounded bg-[var(--theme-card)] border border-[var(--theme-border)]"
                      >
                        <option value="prayer">Prayer</option>
                        <option value="long-term">Long term</option>
                        <option value="salvation">Salvation</option>
                        <option value="pregnancy">Pregnancy</option>
                        <option value="birth">Birth</option>
                        <option value="praise">Praise</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-[var(--theme-text)] truncate">{p.title}</h3>
                      <p className="text-sm opacity-90 whitespace-pre-line">{p.content}</p>
                      <p className="text-xs opacity-70">{p.category}</p>
                    </>
                  )}
                </div>
              </div>

              <RowActions
                p={p}
                onEdit={() => startEdit(p)}
                onSave={() => onSave(p.id)}
                onMove={(to) => onMove(p.id, to)}
                onDelete={() => onDelete(p.id)}
                saving={savingId === p.id}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
