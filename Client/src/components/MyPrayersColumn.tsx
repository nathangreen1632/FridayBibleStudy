// Client/src/components/MyPrayersColumn.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMyPrayersStore } from '../stores/useMyPrayersStore';
import type { Category, Prayer, Status } from '../types/domain.types';
import {ChevronDown} from "lucide-react";

function StatusPill({ s }: Readonly<{ s: Status }>) {
  let label: string;
  let colorClass: string;

  switch (s) {
    case 'active':
      label = 'Prayers';
      colorClass = 'bg-[var(--theme-pill-orange)] text-white';
      break;
    case 'praise':
      label = 'Praise';
      colorClass = 'bg-[var(--theme-pill-green)] text-white';
      break;
    case 'archived':
      label = 'Archived';
      colorClass = 'bg-[#00274C] text-white';
      break;
    default:
      label = 'Active';
      colorClass = 'bg-[var(--theme-card)] text-[var(--theme-text)]';
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-base border border-[var(--theme-border)]',
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
}>): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* Move row (full width, above buttons) */}
      <div className="flex items-center gap-1 basis-full pb-1">
        <span className="text-lg">Move To →</span>
        <button
          type="button"
          onClick={() => props.onMove('active')}
          className="px-2 py-1 rounded bg-[var(--theme-card)] hover:bg-[var(--theme-pill-orange)] hover:text-[var(--theme-textbox)] cursor-pointer"
        >
          Prayers
        </button>
        <button
          type="button"
          onClick={() => props.onMove('praise')}
          className="px-2 py-1 rounded bg-[var(--theme-card)] hover:bg-[var(--theme-pill-green)] hover:text-[var(--theme-textbox)] cursor-pointer"
        >
          Praise
        </button>
        <button
          type="button"
          onClick={() => props.onMove('archived')}
          className="px-2 py-1 rounded bg-[var(--theme-card)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] cursor-pointer"
        >
          Archive
        </button>
      </div>

      {/* Buttons row */}
      <button
        type="button"
        onClick={props.onEdit}
        className="px-3 py-1.5 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] cursor-pointer"
      >
        Edit
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
      className="mt-8 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-[var(--theme-text)]">My Prayers</h2>

        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search my prayers…"
            className="px-3 py-2 rounded-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] placeholder:text-[var(--theme-placeholder)] cursor-pointer"
          />

          {/* Select with lucide chevron */}
          <div className="relative">
            <select
              value={status}
              onChange={onStatusChange}
              className="py-2 pl-3 pr-9 rounded-lg bg-[var(--theme-card)] text-[var(--theme-text)] border border-[var(--theme-border)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="active">Prayers</option>
              <option value="praise">Praise</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown
              size={20}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text)] opacity-80"
              aria-hidden="true"
            />
          </div>
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

          function cancelEdit(id: number) {
            setEditing((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }

          function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 600)}px`; // cap to 600px then scroll
          }


          return (
            <li key={p.id} className="rounded-xl bg-[var(--theme-card)] p-3 border border-[var(--theme-border)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-full">
                  <div className="flex items-center gap-2">
                    <StatusPill s={p.status} />
                    <span className="text-sm opacity-70">{new Date(p.updatedAt).toLocaleString()}</span>
                  </div>

                  {ed ? (
                    <>
                      <input
                        value={ed.title}
                        onChange={(e) => onField('title', e.target.value)}
                        className="mt-2 w-full px-3 py-2 rounded text-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)]"
                      />
                      <textarea
                        value={ed.content}
                        onChange={(e) => onField('content', e.target.value)}
                        onInput={autoGrow}
                        rows={6}
                        className="mt-2 w-full px-3 py-2 rounded text-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] min-h-40 md:min-h-48 leading-6 resize-y max-h-[600px] overflow-auto"
                      />
                      <div className="relative mt-2">
                        <select
                          value={ed.category}
                          onChange={(e) => onField('category', e.target.value)}
                          className="w-full px-3 py-2 pr-9 rounded text-lg bg-[var(--theme-card)] text-[var(--theme-text)] border border-[var(--theme-border)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30 cursor-pointer"
                        >
                          <option value="birth">Birth</option>
                          <option value="long-term">Long term</option>
                          <option value="praise">Praise</option>
                          <option value="prayer">Prayer</option>
                          <option value="pregnancy">Pregnancy</option>
                          <option value="salvation">Salvation</option>
                        </select>

                        {/* Chevron icon overlay (not a caret) */}
                        <ChevronDown
                          size={20}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text)] opacity-80"
                          aria-hidden="true"
                        />
                      </div>

                      {/* Cancel row inside the edit UI */}
                      {/* Editor action row */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cancelEdit(p.id)}
                          className="px-3 py-1.5 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => onSave(p.id)}
                          disabled={savingId === p.id}
                          className="px-3 py-1.5 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p.id)}
                          className="px-3 py-1.5 rounded-md bg-[var(--theme-error)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-error)] hover:text-[var(--theme-textbox)] cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>

                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-xl text-[var(--theme-text)] truncate">{p.title}</h3>
                      <p className="text-lg opacity-90 whitespace-pre-line">{p.content}</p>
                      <p className="text-base opacity-70">{p.category}</p>
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
