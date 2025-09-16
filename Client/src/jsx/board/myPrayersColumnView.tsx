import React from 'react';
import type { Category, Prayer, Status } from '../../types/domain/domain.types.ts';
import ConfirmBar from '../../common/ConfirmBar.tsx';
import { ChevronDown } from 'lucide-react';
import { pressBtn } from '../../../ui/press.ts';

function StatusPill({ s }: Readonly<{ s: Status }>) {
  let label: string;
  let colorClass: string;

  switch (s) {
    case 'active':
      label = 'Prayers';
      colorClass = 'bg-[var(--theme-pill-orange)] text-white';
      break;
    case 'praise':
      label = 'Praises';
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
  onMove: (to: Status) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  saving: boolean;
}>): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* Move row (full width, above buttons) */}
      <div className="flex items-center gap-1 basis-full pb-1">
        <span className="text-lg text-[var(--theme-text-white)]">Move To →</span>
        <button
          type="button"
          onClick={() => props.onMove('active')}
          className={pressBtn('px-2 py-1 rounded bg-[var(--theme-pill-orange)] text-[var(--theme-textbox)] hover:bg-[var(--theme-pill-orange)]/80 hover:text-[var(--theme-textbox)] cursor-pointer')}
        >
          Prayers
        </button>
        <button
          type="button"
          onClick={() => props.onMove('praise')}
          className={pressBtn('px-2 py-1 rounded bg-[var(--theme-pill-green)] text-[var(--theme-textbox)] hover:bg-[var(--theme-pill-green)]/80 hover:text-[var(--theme-textbox)] cursor-pointer')}
        >
          Praises
        </button>
        <button
          type="button"
          onClick={() => props.onMove('archived')}
          className={pressBtn('px-2 py-1 rounded bg-[var(--theme-button-hover)] text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]/80 hover:text-[var(--theme-textbox)] cursor-pointer')}
        >
          Archived
        </button>
      </div>

      {/* Buttons row */}
      <button
        type="button"
        onClick={props.onEdit}
        disabled={props.saving}
        className={pressBtn('px-3 py-1.5 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] cursor-pointer disabled:opacity-60')}
      >
        Edit
      </button>
    </div>
  );
}

type Props = Readonly<{
  // list + loading
  items: Prayer[];
  loading: boolean;
  error: string;

  // query/status UI
  q: string;
  setQuery: (v: string) => void;
  status: 'all' | Status;
  onStatusChange: (next: 'all' | Status) => void;

  // editing state & actions
  editing: Record<number, { title: string; content: string; category: Category }>;
  startEdit: (p: Prayer) => void;
  cancelEdit: (id: number) => void;
  setField: (id: number, field: 'title' | 'content' | 'category', value: string) => void;
  savingId: number | null;
  confirmingDeleteId: number | null;
  setConfirmingDeleteId: (id: number | null) => void;

  // operations
  onSave: (id: number) => void | Promise<void>;
  onMove: (id: number, to: Status) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}>;

export default function MyPrayersColumnView({
                                              items, loading, error,
                                              q, setQuery, status, onStatusChange,
                                              editing, startEdit, cancelEdit, setField, savingId,
                                              confirmingDeleteId, setConfirmingDeleteId,
                                              onSave, onMove, onDelete,
                                            }: Props): React.ReactElement {
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
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search my prayers…"
            className="px-3 py-2 rounded-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] placeholder:text-[var(--theme-placeholder)] cursor-pointer"
          />

          {/* Select with lucide chevron */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.currentTarget.value as 'all' | Status)}
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
              aria-hidden
            />
          </div>
        </div>
      </header>

      {loading ? <p className="mt-4 opacity-70">Loading…</p> : null}
      {!loading && error ? <p className="mt-4 text-[var(--theme-error)]">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="mt-4 opacity-70">No prayers yet.</p> : null}

      <ul className="mt-4 space-y-3">
        {items.map((p) => {
          const ed = editing[p.id];

          function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 600)}px`;
          }

          return (
            <li key={p.id} className="rounded-xl bg-[var(--theme-accent)] p-3 border border-[var(--theme-border)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-full">
                  <div className="flex items-center gap-2">
                    <StatusPill s={p.status} />
                    <span className="text-sm text-[var(--theme-text-white)] opacity-70">
                      {new Date(p.updatedAt).toLocaleString()}
                    </span>
                  </div>

                  {ed ? (
                    <>
                      <input
                        value={ed.title}
                        placeholder="Title"
                        spellCheck
                        onChange={(e) => setField(p.id, 'title', e.currentTarget.value)}
                        className="mt-2 w-full px-3 py-2 rounded text-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] placeholder:text-[var(--theme-placeholder)] cursor-pointer"
                      />

                      <textarea
                        value={ed.content}
                        placeholder="Write your prayer here..."
                        spellCheck
                        onChange={(e) => setField(p.id, 'content', e.currentTarget.value)}
                        onInput={autoGrow}
                        rows={6}
                        className="mt-2 w-full px-3 py-2 rounded text-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] min-h-40 md:min-h-48 leading-6 resize-y max-h-[600px] overflow-auto cursor-pointer"
                      />

                      <div className="relative mt-2">
                        <select
                          value={ed.category}
                          onChange={(e) => setField(p.id, 'category', e.currentTarget.value)}
                          className="w-full px-3 py-2 pr-9 rounded text-lg bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] border border-[var(--theme-border)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30 cursor-pointer"
                        >
                          <option value="birth">Birth</option>
                          <option value="long-term">Long term</option>
                          <option value="praise">Praise</option>
                          <option value="prayer">Prayer</option>
                          <option value="pregnancy">Pregnancy</option>
                          <option value="salvation">Salvation</option>
                        </select>

                        <ChevronDown
                          size={20}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-80 text-[var(--theme-placeholder)]"
                          aria-hidden
                        />
                      </div>

                      {/* Editor action row */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingDeleteId(null);
                            cancelEdit(p.id);
                          }}
                          className={pressBtn('px-3 py-1.5 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 cursor-pointer')}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setConfirmingDeleteId(null);
                            await onSave(p.id);
                          }}
                          disabled={savingId === p.id}
                          className={pressBtn('px-3 py-1.5 rounded-md bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 cursor-pointer')}
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(p.id)}
                          className={pressBtn('px-3 py-1.5 rounded-md bg-[var(--theme-error)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-error)] hover:text-[var(--theme-textbox)] cursor-pointer')}
                        >
                          Delete
                        </button>
                      </div>

                      {/* Inline confirm bar (only for this row) */}
                      {confirmingDeleteId === p.id ? (
                        <div className="mt-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                          <ConfirmBar
                            message={`Delete “${(ed.title || p.title).trim()}”? This cannot be undone.`}
                            confirmLabel="Delete"
                            cancelLabel="Keep editing"
                            onConfirm={async () => {
                              await onDelete(p.id);
                              setConfirmingDeleteId(null);
                            }}
                            onCancel={() => setConfirmingDeleteId(null)}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-xl text-[var(--theme-text-white)] truncate">{p.title}</h3>
                      <p className="text-lg text-[var(--theme-text-white)] opacity-90 whitespace-pre-line">{p.content}</p>
                      <p className="text-base text-[var(--theme-text-white)] opacity-70">{p.category}</p>
                    </>
                  )}
                </div>
              </div>

              <RowActions
                p={p}
                onEdit={() => startEdit(p)}
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
