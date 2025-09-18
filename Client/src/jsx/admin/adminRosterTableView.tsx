import React from 'react';
import { ArrowUpAZ, ArrowDownAZ, Pencil, Save, X, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import type { RosterSortField } from '../../stores/admin/useAdminStore';
import type { AdminRosterRow, RosterEditKey, RosterColumnDef } from '../../types/domain/roster.types.ts';
import { pressBtn } from '../../../ui/press';

function SortableHeader(props: Readonly<{
  label: string;
  field: RosterSortField;
  activeField: RosterSortField | null;
  direction: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
}>): React.ReactElement {
  const { label, field, activeField, direction, onSort } = props;
  const isActive = activeField === field;

  let icon: React.ReactElement | null = null;
  if (isActive && direction === 'asc') {
    icon = <ArrowUpAZ className="w-5 h-5 text-[var(--theme-button-hover)] ml-auto" aria-hidden />;
  } else if (isActive && direction === 'desc') {
    icon = <ArrowDownAZ className="w-5 h-5 text-[var(--theme-pill-orange)] ml-auto" aria-hidden />;
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

function RosterReadRow({
                         r,
                         onStartEdit,
                         onTogglePause,
                         onDelete,
                       }: Readonly<{
  r: AdminRosterRow;
  onStartEdit: (row: AdminRosterRow) => void;
  onTogglePause: (id: number, next: boolean) => void | Promise<void>;
  onDelete: (id: number, name: string) => void | Promise<void>;
}>): React.ReactElement {
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

function RosterEditRow({
                         r,
                         form,
                         onChange,
                         onSave,
                         onCancel,
                         busy,
                         EDIT_KEYS,
                       }: Readonly<{
  r: AdminRosterRow;
  form: Partial<AdminRosterRow>;
  onChange: (k: RosterEditKey, v: string) => void;
  onSave: (id: number) => void | Promise<void>;
  onCancel: () => void;
  busy: boolean;
  EDIT_KEYS: readonly RosterEditKey[];
}>): React.ReactElement {
  return (
    <tr className="even:bg-[var(--theme-card-alt)]">
      {EDIT_KEYS.map((k) => (
        <td key={k} className="px-3 py-2">
          <input
            value={(form as Record<string, string | undefined>)[k] ?? ''}
            onChange={(e) => onChange(k, e.currentTarget.value)}
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

type ViewProps = Readonly<{
  className?: string;
  rows: AdminRosterRow[];
  columns: readonly RosterColumnDef[];
  sortBy: RosterSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
  editId: number | null;
  form: Partial<AdminRosterRow>;
  busy: boolean;
  error: string;
  EDIT_KEYS: readonly RosterEditKey[];
  onStartEdit: (r: AdminRosterRow) => void;
  onChange: (k: RosterEditKey, v: string) => void;
  onSave: (id: number) => void | Promise<void>;
  onCancel: () => void;
  onTogglePause: (id: number, next: boolean) => void | Promise<void>;
  onDelete: (id: number, name: string) => void | Promise<void>;
}>;

export default function AdminRosterTableView({
                                               className,
                                               rows,
                                               columns,
                                               sortBy,
                                               sortDir,
                                               onSort,
                                               editId,
                                               form,
                                               busy,
                                               error,
                                               EDIT_KEYS,
                                               onStartEdit,
                                               onChange,
                                               onSave,
                                               onCancel,
                                               onTogglePause,
                                               onDelete,
                                             }: ViewProps): React.ReactElement {
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
        {error ? <span className="text-[var(--theme-error)] text-sm">{error}</span> : null}
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
                onChange={onChange}
                onSave={onSave}
                onCancel={onCancel}
                busy={busy}
                EDIT_KEYS={EDIT_KEYS}
              />
            ) : (
              <RosterReadRow
                key={r.id}
                r={r}
                onStartEdit={onStartEdit}
                onTogglePause={onTogglePause}
                onDelete={onDelete}
              />
            )
          )}

          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 opacity-70" colSpan={columns.length + 1}>
                No members found.
              </td>
            </tr>
          ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
