// Client/src/components/admin/AdminRosterTable.tsx
import React, { useMemo, useState } from 'react';
import { ArrowUpAZ, ArrowDownAZ, Pencil, Save, X, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import type { RosterSortField } from '../../stores/admin/useAdminStore';
import {pressBtn} from "../../../ui/press.ts";

type Row = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;

  /** NEW: UI needs to know if email is paused */
  emailPaused: boolean;
};

type Props = {
  rows: Row[];
  className?: string;

  // ✅ sorting props typed to the union
  sortBy: RosterSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
};

// ✅ column keys exactly the allowed sort fields
type ColumnDef = {
  key: RosterSortField;
  label: string;
};

function SortableHeader(props: Readonly<{
  label: string;
  field: RosterSortField;
  activeField: RosterSortField | null;
  direction: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
}>) {
  const { label, field, activeField, direction, onSort } = props;
  const isActive = activeField === field;

  let icon: React.ReactElement | null = null;
  if (isActive && direction === 'asc') {
    icon = <ArrowUpAZ className="w-5 h-5 text-[var(--theme-button-hover)] ml-auto" aria-hidden="true" />;
  } else if (isActive && direction === 'desc') {
    icon = <ArrowDownAZ className="w-5 h-5 text-[var(--theme-pill-orange)] ml-auto" aria-hidden="true" />;
  }

  // ✅ no nested ternary
  let ariaSort: 'none' | 'ascending' | 'descending' = 'none';
  if (isActive) {
    if (direction === 'asc') {
      ariaSort = 'ascending';
    } else {
      ariaSort = 'descending';
    }
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

export default function AdminRosterTable({
                                           rows,
                                           className,
                                           sortBy,
                                           sortDir,
                                           onSort,
                                         }: Readonly<Props>): React.ReactElement {
  const { updateRosterRow, deleteRosterRow, toggleRosterEmailPaused } = useAdminStore();

  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Row>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const columns = useMemo<readonly ColumnDef[]>(
    () => [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'addressStreet', label: 'Street' },
      { key: 'addressCity', label: 'City' },
      { key: 'addressState', label: 'State' },
      { key: 'addressZip', label: 'Zip' },
      { key: 'spouseName', label: 'Spouse' },
    ],
    []
  );

  function startEdit(r: Row) {
    setEditId(r.id);
    setForm({
      name: r.name ?? '',
      email: r.email ?? '',
      phone: r.phone ?? '',
      addressStreet: r.addressStreet ?? '',
      addressCity: r.addressCity ?? '',
      addressState: r.addressState ?? '',
      addressZip: r.addressZip ?? '',
      spouseName: r.spouseName ?? '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm({});
    setBusy(false);
    setError('');
  }

  function nullish(v: unknown): string | null {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === '') return null;
    return s;
  }

  async function saveEdit(id: number) {
    if (busy) return;
    setBusy(true);
    setError('');

    const payload = {
      name: typeof form.name === 'string' ? form.name.trim() : undefined,
      email: typeof form.email === 'string' ? form.email.trim() : undefined,
      phone: typeof form.phone === 'string' ? form.phone.trim() : nullish(form.phone),
      addressStreet:
        typeof form.addressStreet === 'string' ? form.addressStreet.trim() : nullish(form.addressStreet),
      addressCity:
        typeof form.addressCity === 'string' ? form.addressCity.trim() : nullish(form.addressCity),
      addressState:
        typeof form.addressState === 'string' ? form.addressState.trim() : nullish(form.addressState),
      addressZip:
        typeof form.addressZip === 'string' ? form.addressZip.trim() : nullish(form.addressZip),
      spouseName:
        typeof form.spouseName === 'string' ? form.spouseName.trim() : nullish(form.spouseName),
    };

    const res = await updateRosterRow(id, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? 'Update failed.');
      return;
    }
    cancelEdit();
  }

  async function onDelete(id: number, name: string) {
    if (busy) return;
    const ok = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    const res = await deleteRosterRow(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? 'Delete failed.');
    }
  }

  async function onTogglePause(id: number, next: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    const res = await toggleRosterEmailPaused(id, next);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? 'Unable to update pause state.');
    }
  }


  return (
    <div
      className={[
        'rounded-xl border',
        'border-[var(--theme-border)]',
        'bg-[var(--theme-surface)]',
        className ?? '',
      ].join(' ')}
    >
      <div className="px-3 py-2 font-semibold flex items-center justify-between">
        <span>Roster</span>
        {error && <span className="text-[var(--theme-error)] text-sm">{error}</span>}
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--theme-strip)] text-[var(--theme-strip-text)]">
          <tr>
            {columns.map((c) => (
              <SortableHeader
                key={c.key}
                label={c.label}
                field={c.key}
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
            ))}
            <th className="px-3 py-2 text-right border-b-2 border-t-2 border-[var(--theme-border)]">
              Actions
            </th>
          </tr>
          </thead>

          <tbody>
          {rows.map((r) => {
            const isEditing = editId === r.id;

            if (!isEditing) {
              return (
                <tr
                  key={r.id}
                  className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]"
                >
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.email}</td>
                  <td className="px-3 py-2">{r.phone ?? ''}</td>
                  <td className="px-3 py-2">{r.addressStreet ?? ''}</td>
                  <td className="px-3 py-2">{r.addressCity ?? ''}</td>
                  <td className="px-3 py-2">{r.addressState ?? ''}</td>
                  <td className="px-3 py-2">{r.addressZip ?? ''}</td>
                  <td className="px-3 py-2">{r.spouseName ?? ''}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* NEW: Pause/Play toggle between pencil and delete */}
                      <button
                        type="button"
                        onClick={() => { void onTogglePause(r.id, !r.emailPaused); }}
                        className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]")}
                        aria-label={r.emailPaused ? 'Resume email updates' : 'Pause email updates'}
                        title={r.emailPaused ? 'Resume email updates' : 'Pause email updates'}
                      >
                        {r.emailPaused ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void onDelete(r.id, r.name);
                        }}
                        className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-error)]")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={r.id} className="even:bg-[var(--theme-card-alt)]">
                {(
                  [
                    'name',
                    'email',
                    'phone',
                    'addressStreet',
                    'addressCity',
                    'addressState',
                    'addressZip',
                    'spouseName',
                  ] as const
                ).map((k) => (
                  <td key={k} className="px-3 py-2">
                    <input
                      value={(form as Record<string, string | undefined>)[k] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder:text-[var(--theme-placeholder)]"
                      placeholder="Enter value"
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void saveEdit(r.id);
                      }}
                      className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]")}
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={cancelEdit}
                      className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {!rows.length && (
            <tr>
              <td className="px-3 py-4 opacity-70" colSpan={9}>
                No members found.
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
