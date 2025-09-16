import React, { useEffect, useMemo, useState } from 'react';
import { useMyPrayersStore } from '../stores/useMyPrayersStore';
import type { Category, Prayer, Status } from '../types/domain/domain.types.ts';
import MyPrayersColumnView from '../jsx/board/myPrayersColumnView.tsx';

type EditingState = Record<number, { title: string; content: string; category: Category }>;

export default function MyPrayersColumnLogic(): React.ReactElement {
  const {
    byId, ids, loading, error,
    q, status, category,
    setQuery, setStatus,
    fetchInitial, save, moveTo, remove
  } = useMyPrayersStore();

  const [editing, setEditing] = useState<EditingState>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {
        // ignore
      }
    })();
  }, [fetchInitial]);

  const items = useMemo<Prayer[]>(() => {
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

  function startEdit(p: Prayer): void {
    if (editing[p.id]) return;
    setEditing((prev) => ({ ...prev, [p.id]: { title: p.title, content: p.content, category: p.category } }));
  }

  function cancelEdit(id: number): void {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setField(id: number, field: 'title' | 'content' | 'category', value: string): void {
    setEditing((prev) => {
      const base = prev[id] ?? (() => {
        const p = byId.get(id);
        return { title: p?.title ?? '', content: p?.content ?? '', category: (p?.category ?? 'prayer') as Category };
      })();
      if (field === 'title') return { ...prev, [id]: { ...base, title: value } };
      if (field === 'content') return { ...prev, [id]: { ...base, content: value } };
      return { ...prev, [id]: { ...base, category: value as Category } };
    });
  }

  async function onSave(id: number): Promise<void> {
    const cur = editing[id];
    if (!cur) return;
    setSavingId(id);
    const ok = await save(id, { title: cur.title, content: cur.content, category: cur.category });
    setSavingId(null);
    if (!ok) return;
    cancelEdit(id);
  }

  async function onMove(id: number, to: Status): Promise<void> {
    setSavingId(id);
    const ok = await moveTo(id, to);
    setSavingId(null);
    if (!ok) return;
  }

  async function onDelete(id: number): Promise<void> {
    const ok = await remove(id);
    if (!ok) return;
    cancelEdit(id);
  }

  function onStatusChange(next: 'all' | Status): void {
    setStatus(next);
  }

  return (
    <MyPrayersColumnView
      // list + state
      items={items}
      loading={loading}
      error={error || ''}
      // query/status UI
      q={q}
      setQuery={setQuery}
      status={status}
      onStatusChange={onStatusChange}
      // per-row editing
      editing={editing}
      startEdit={startEdit}
      cancelEdit={cancelEdit}
      setField={setField}
      savingId={savingId}
      confirmingDeleteId={confirmingDeleteId}
      setConfirmingDeleteId={setConfirmingDeleteId}
      // actions
      onSave={onSave}
      onMove={onMove}
      onDelete={onDelete}
    />
  );
}
