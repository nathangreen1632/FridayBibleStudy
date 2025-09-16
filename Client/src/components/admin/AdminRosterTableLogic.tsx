import React, { useCallback, useMemo, useState } from 'react';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import type { RosterSortField } from '../../stores/admin/useAdminStore';
import AdminRosterTableView from '../../jsx/admin/adminRosterTableView';
import type { AdminRosterRow, RosterEditKey, RosterColumnDef } from '../../types/domain/roster.types.ts';

type Props = Readonly<{
  rows: AdminRosterRow[];
  className?: string;
  sortBy: RosterSortField | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: RosterSortField) => void;
}>;

/* -------------------- Small helpers -------------------- */
// Only accept string-ish inputs from our form; never stringify objects.
function toNullish(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = v.trim();
  return s === '' ? null : s;
}

// Fields editable in-line
const EDIT_KEYS: readonly RosterEditKey[] = [
  'name',
  'email',
  'phone',
  'addressStreet',
  'addressCity',
  'addressState',
  'addressZip',
  'spouseName',
] as const;

export default function AdminRosterTableLogic({
                                                rows,
                                                className,
                                                sortBy,
                                                sortDir,
                                                onSort,
                                              }: Props): React.ReactElement {
  const { updateRosterRow, deleteRosterRow, toggleRosterEmailPaused } = useAdminStore();

  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<AdminRosterRow>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const columns = useMemo<readonly RosterColumnDef[]>(
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

  const startEdit = useCallback((r: AdminRosterRow) => {
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

  const changeField = useCallback((k: RosterEditKey, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const { name, email, phone, addressStreet, addressCity, addressState, addressZip, spouseName } = form;

  const saveEdit = useCallback(async (id: number) => {
    const payload = {
      name: typeof name === 'string' ? name.trim() : undefined,
      email: typeof email === 'string' ? email.trim() : undefined,
      phone: typeof phone === 'string' ? phone.trim() : toNullish(phone as string | null | undefined),
      addressStreet:
        typeof addressStreet === 'string' ? addressStreet.trim() : toNullish(addressStreet as string | null | undefined),
      addressCity:
        typeof addressCity === 'string' ? addressCity.trim() : toNullish(addressCity as string | null | undefined),
      addressState:
        typeof addressState === 'string' ? addressState.trim() : toNullish(addressState as string | null | undefined),
      addressZip:
        typeof addressZip === 'string' ? addressZip.trim() : toNullish(addressZip as string | null | undefined),
      spouseName:
        typeof spouseName === 'string' ? spouseName.trim() : toNullish(spouseName as string | null | undefined),
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

  const onDelete = useCallback(async (id: number, personName: string) => {
    if (busy) return;
    const ok = window.confirm(`Delete ${personName}? This cannot be undone.`);
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
    <AdminRosterTableView
      className={className}
      rows={rows}
      columns={columns}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      // edit state + actions
      editId={editId}
      form={form}
      busy={busy}
      error={error}
      EDIT_KEYS={EDIT_KEYS}
      onStartEdit={startEdit}
      onChange={changeField}
      onSave={saveEdit}
      onCancel={cancelEdit}
      onTogglePause={onTogglePause}
      onDelete={onDelete}
    />
  );
}
