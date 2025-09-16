// Client/src/pages/EventsPageLogic.tsx
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/useAuthStore.ts';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  emailEvent,
  type EventRow,
} from '../../helpers/api/eventsApi.ts';
import { toLocalInputValue } from '../../helpers/events.helper.ts';
import EventsPageView from '../../jsx/events/eventsPageView.tsx';

export default function EventsPage(): React.ReactElement {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create form (admin)
  const [create, setCreate] = useState({
    title: '',
    content: '',
    startsAt: '',
    endsAt: '',
    location: '',
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(
    () => items.find((x) => x.id === editingId) || null,
    [items, editingId]
  );

  const [edit, setEdit] = useState({
    title: '',
    content: '',
    startsAt: '',
    endsAt: '',
    location: '',
  });

  const hasChanges = useMemo(() => {
    if (!editing) return false;
    const sAt = editing.startsAt ? toLocalInputValue(editing.startsAt) : '';
    const eAt = editing.endsAt ? toLocalInputValue(editing.endsAt) : '';
    if (edit.title !== (editing.title || '')) return true;
    if (edit.content !== (editing.content || '')) return true;
    if (edit.location !== (editing.location || '')) return true;
    if (edit.startsAt !== sAt) return true;
    return edit.endsAt !== eAt;
  }, [editing, edit]);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<EventRow | null>(null);

  function openModal(ev: EventRow) {
    try {
      setModalEvent(ev);
      setModalOpen(true);
    } catch {
      // ignore
    }
  }
  function closeModal() {
    try {
      setModalOpen(false);
      setModalEvent(null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchEvents();
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) toast.error('Unable to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    // Use the exact parameter type that createEvent expects
    const payload: Parameters<typeof createEvent>[0] = {
      title: create.title,
      content: create.content,
      // optional fields: send undefined when empty to satisfy the union types
      startsAt: create.startsAt ? create.startsAt : undefined,
      endsAt: create.endsAt ? create.endsAt : undefined,
      location: create.location ? create.location : undefined,
    };

    try {
      const res = await createEvent(payload);
      if (!res.ok) {
        toast.error('Create failed');
        return;
      }

      // reset form
      setCreate({ title: '', content: '', startsAt: '', endsAt: '', location: '' });

      if (res.data) {
        setItems((prev) => [res.data as EventRow, ...prev]);
      } else {
        const list = await fetchEvents();
        setItems(list);
      }
      toast.success('Event created');
      setIsCreateOpen(false);
    } catch {
      toast.error('Create failed');
    }
  }

  function beginEdit(id: number) {
    const row = items.find((x) => x.id === id);
    if (!row) return;

    setEditingId(id);
    setEdit({
      title: row.title || '',
      content: row.content || '',
      location: row.location || '',
      startsAt: row.startsAt ? toLocalInputValue(row.startsAt) : '',
      endsAt: row.endsAt ? toLocalInputValue(row.endsAt) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit({ title: '', content: '', location: '', startsAt: '', endsAt: '' });
  }

  async function saveEdit(id: number) {
    const patch: Record<string, unknown> = {
      title: edit.title,
      content: edit.content,
      location: edit.location,
    };
    if (edit.startsAt) patch.startsAt = new Date(edit.startsAt).toISOString();
    if (edit.endsAt) patch.endsAt = new Date(edit.endsAt).toISOString();

    try {
      const res = await updateEvent(id, patch);
      if (!res.ok) {
        toast.error('Update failed');
        return;
      }

      if (res.data) {
        setItems((prev) => prev.map((x) => (x.id === id ? (res.data as EventRow) : x)));
      } else {
        const list = await fetchEvents();
        setItems(list);
      }
      cancelEdit();
      toast.success('Event updated');
    } catch {
      toast.error('Update failed');
    }
  }

  async function removeRow(id: number) {
    const ok = window.confirm('Delete this event?');
    if (!ok) return;

    try {
      const success = await deleteEvent(id);
      if (!success) {
        toast.error('Delete failed');
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success('Event deleted');
    } catch {
      toast.error('Delete failed');
    }
  }

  async function onEmailEvent(id: number) {
    try {
      const ok = await emailEvent(id);
      if (ok) {
        toast.success('Event emailed to the group.');
      } else {
        toast.error('Could not send the email.');
      }
    } catch {
      toast.error('Could not send the email.');
    }
  }

  return (
    <EventsPageView
      isAdmin={Boolean(isAdmin)}
      items={items}
      loading={loading}
      create={create}
      setCreate={setCreate}
      isCreateOpen={isCreateOpen}
      toggleCreateOpen={() => setIsCreateOpen((v) => !v)}
      onCreate={onCreate}
      editingId={editingId}
      edit={edit}
      setEdit={setEdit}
      hasChanges={hasChanges}
      beginEdit={beginEdit}
      cancelEdit={cancelEdit}
      saveEdit={saveEdit}
      onEmailEvent={onEmailEvent}
      removeRow={removeRow}
      modalOpen={modalOpen}
      modalEvent={modalEvent}
      closeModal={closeModal}
      openModal={openModal}
    />
  );
}
