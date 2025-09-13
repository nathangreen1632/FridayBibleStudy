// Client/src/components/admin/AdminRosterTable.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { ArrowUpAZ, ArrowDownAZ, Pencil, Save, X, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import type { RosterSortField } from '../../stores/admin/useAdminStore';
import { pressBtn } from '../../../ui/press.ts';

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
  sortBy: RosterSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
};

type ColumnDef = { key: RosterSortField; label: string };

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
  if (isActive && direction === 'asc') icon = <ArrowUpAZ className="w-5 h-5 text-[var(--theme-button-hover)] ml-auto" aria-hidden="true" />;
  else if (isActive && direction === 'desc') icon = <ArrowDownAZ className="w-5 h-5 text-[var(--theme-pill-orange)] ml-auto" aria-hidden="true" />;

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

/* -------------------- Small helpers -------------------- */
function toNullish(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  return s;
}

const EDIT_KEYS = [
  'name',
  'email',
  'phone',
  'addressStreet',
  'addressCity',
  'addressState',
  'addressZip',
  'spouseName',
] as const;

/* -------------------- Read-only row -------------------- */
function RosterReadRow({
                         r,
                         onStartEdit,
                         onTogglePause,
                         onDelete,
                       }: Readonly<{
  r: Row;
  onStartEdit: (row: Row) => void;
  onTogglePause: (id: number, next: boolean) => Promise<void>;
  onDelete: (id: number, name: string) => Promise<void>;
}>) {
  return (
    <tr className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]">
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
            onClick={() => onStartEdit(r)}
            className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]")}
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onTogglePause(r.id, !r.emailPaused)}
            className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]")}
            aria-label={r.emailPaused ? 'Resume email updates' : 'Pause email updates'}
            title={r.emailPaused ? 'Resume email updates' : 'Pause email updates'}
          >
            {r.emailPaused ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onDelete(r.id, r.name)}
            className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-error)]")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* -------------------- Edit row -------------------- */
function RosterEditRow({
                         r,
                         form,
                         onChange,
                         onSave,
                         onCancel,
                         busy,
                       }: Readonly<{
  r: Row;
  form: Partial<Row>;
  onChange: (k: typeof EDIT_KEYS[number], v: string) => void;
  onSave: (id: number) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}>) {
  return (
    <tr className="even:bg-[var(--theme-card-alt)]">
      {EDIT_KEYS.map((k) => (
        <td key={k} className="px-3 py-2">
          <input
            value={(form as Record<string, string | undefined>)[k] ?? ''}
            onChange={(e) => onChange(k, e.target.value)}
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
            onClick={() => onSave(r.id)}
            className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]")}
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={pressBtn("px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* -------------------- Main table -------------------- */
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

  const startEdit = useCallback((r: Row) => {
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
  }, []);

  const cancelEdit = useCallback(() => {
    setEditId(null);
    setForm({});
    setBusy(false);
    setError('');
  }, []);

  const changeField = useCallback((k: typeof EDIT_KEYS[number], v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const { name, email, phone, addressStreet, addressCity, addressState, addressZip, spouseName } = form;

  const saveEdit = useCallback(async (id: number) => {
    const payload = {
      name: typeof name === 'string' ? name.trim() : undefined,
      email: typeof email === 'string' ? email.trim() : undefined,
      phone: typeof phone === 'string' ? phone.trim() : toNullish(phone),
      addressStreet: typeof addressStreet === 'string' ? addressStreet.trim() : toNullish(addressStreet),
      addressCity: typeof addressCity === 'string' ? addressCity.trim() : toNullish(addressCity),
      addressState: typeof addressState === 'string' ? addressState.trim() : toNullish(addressState),
      addressZip: typeof addressZip === 'string' ? addressZip.trim() : toNullish(addressZip),
      spouseName: typeof spouseName === 'string' ? spouseName.trim() : toNullish(spouseName),
    };

    try {
      const res = await updateRosterRow(id, payload);
      if (!res.ok) {
        setError(res.message ?? 'Update failed.');
        setBusy(false);
        return;
      }
      cancelEdit();
    } catch {
      setError('Update failed.');
      setBusy(false);
    }
  }, [name, email, phone, addressStreet, addressCity, addressState, addressZip, spouseName, updateRosterRow, cancelEdit]);


  const onDelete = useCallback(async (id: number, name: string) => {
    if (busy) return;
    const ok = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    try {
      const res = await deleteRosterRow(id);
      if (!res.ok) setError(res.message ?? 'Delete failed.');
    } catch {
      setError('Delete failed.');
    } finally {
      setBusy(false);
    }
  }, [busy, deleteRosterRow]);

  const onTogglePause = useCallback(async (id: number, next: boolean) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await toggleRosterEmailPaused(id, next);
      if (!res.ok) setError(res.message ?? 'Unable to update pause state.');
    } catch {
      setError('Unable to update pause state.');
    } finally {
      setBusy(false);
    }
  }, [busy, toggleRosterEmailPaused]);

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
            <th className="px-3 py-2 text-right border-b-2 border-t-2 border-[var(--theme-border)]">Actions</th>
          </tr>
          </thead>

          <tbody>
          {rows.map((r) =>
            editId === r.id ? (
              <RosterEditRow
                key={r.id}
                r={r}
                form={form}
                onChange={changeField}
                onSave={saveEdit}
                onCancel={cancelEdit}
                busy={busy}
              />
            ) : (
              <RosterReadRow
                key={r.id}
                r={r}
                onStartEdit={startEdit}
                onTogglePause={onTogglePause}
                onDelete={onDelete}
              />
            )
          )}

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
