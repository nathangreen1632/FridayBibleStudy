// Client/src/pages/EventsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react'; // if you use react-lucide, change to: import { ChevronDown } from 'react-lucide';
import { useAuthStore } from '../stores/useAuthStore';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type EventRow,
} from '../helpers/api/eventsApi';
import EventModal from '../modals/EventModal'; // ✅

export default function EventsPage(): React.ReactElement {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create form (admin)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [endsAt, setEndsAt] = useState('');

  // collapse toggle for create form
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(
    () => items.find((x) => x.id === editingId) || null,
    [items, editingId]
  );

  const [eTitle, setETitle] = useState('');
  const [eContent, setEContent] = useState('');
  const [eStartsAt, setEStartsAt] = useState('');
  const [eEndsAt, setEEndsAt] = useState('');
  const [eLocation, setELocation] = useState('');

  // Disable Save unless something changed
  const hasChanges = useMemo(() => {
    if (!editing) return false;
    const sAt = editing.startsAt ? toLocalInputValue(editing.startsAt) : '';
    const eAt = editing.endsAt ? toLocalInputValue(editing.endsAt) : '';
    if (eTitle !== (editing.title || '')) return true;
    if (eContent !== (editing.content || '')) return true;
    if (eLocation !== (editing.location || '')) return true;
    if (eStartsAt !== sAt) return true;
    return eEndsAt !== eAt;
  }, [editing, eTitle, eContent, eLocation, eStartsAt, eEndsAt]);

  // Modal state
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
        toast.error('Unable to load events');
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

    const payload: any = { title, content };
    if (startsAt) payload.startsAt = startsAt;
    if (endsAt) payload.endsAt = endsAt;
    if (location) payload.location = location;

    const res = await createEvent(payload);
    if (!res.ok) {
      toast.error('Create failed');
      return;
    }
    setTitle('');
    setContent('');
    setStartsAt('');
    setEndsAt('');
    setLocation('');

    if (res.data) {
      setItems((prev) => [res.data as EventRow, ...prev]);
    } else {
      const list = await fetchEvents();
      setItems(list);
    }
    toast.success('Event created');
    setIsCreateOpen(false);
  }

  function beginEdit(id: number) {
    const row = items.find((x) => x.id === id);
    if (!row) return;

    setEditingId(id);
    setETitle(row.title || '');
    setEContent(row.content || '');
    setELocation(row.location || '');
    setEStartsAt(row.startsAt ? toLocalInputValue(row.startsAt) : '');
    setEEndsAt(row.endsAt ? toLocalInputValue(row.endsAt) : '');
  }

  function cancelEdit() {
    setEditingId(null);
    setETitle('');
    setEContent('');
    setELocation('');
    setEStartsAt('');
    setEEndsAt('');
  }

  async function saveEdit(id: number) {
    const patch: any = {
      title: eTitle,
      content: eContent,
      location: eLocation,
    };
    if (eStartsAt) patch.startsAt = new Date(eStartsAt).toISOString();
    if (eEndsAt) patch.endsAt = new Date(eEndsAt).toISOString();

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
  }

  async function removeRow(id: number) {
    const ok = window.confirm('Delete this event?');
    if (!ok) return;

    const success = await deleteEvent(id);
    if (!success) {
      toast.error('Delete failed');
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success('Event deleted');
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4">
      <h1 className="mb-3 text-2xl font-extrabold">Events</h1>

      {isAdmin && (
        <div className="mb-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
          {/* Toggle header */}
          <button
            type="button"
            aria-expanded={isCreateOpen}
            onClick={() => setIsCreateOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-t-xl px-3 py-2"
          >
            <span className="font-semibold">Create Event</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isCreateOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Collapsible body */}
          {isCreateOpen && (
            <form
              onSubmit={onCreate}
              className="flex flex-col gap-2 border-t border-[var(--theme-border)] p-3 bg-[var(--theme-surface)]"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Details"
                className="min-h-[120px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                />
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                />
              </div>

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
              />

              <div className="flex justify-end">
                <button className="rounded-xl px-4 py-2 bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]">
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* === GRID of independent event cards (no list / no dividers) === */}
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-accent)] p-3">
        {loading && <div className="p-3">Loading…</div>}

        {!loading && items.length === 0 && <div className="p-3">No events yet.</div>}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 bg-[var(--theme-accent)]">
            {items.map((ev) => {
              const isEditing = editingId === ev.id;

              if (isEditing) {
                return (
                  <section
                    key={ev.id}
                    className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm"
                  >
                    <div className="mb-2 text-xs opacity-60">
                      Editing “{eTitle || (editing?.title ?? 'Untitled')}”
                    </div>

                    <input
                      value={eTitle}
                      onChange={(e) => setETitle(e.target.value)}
                      placeholder="Title"
                      className="mb-2 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                    />

                    <textarea
                      value={eContent}
                      onChange={(e) => setEContent(e.target.value)}
                      placeholder="Details"
                      className="mb-2 min-h-[100px] w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                    />

                    <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="datetime-local"
                        value={eStartsAt}
                        onChange={(e) => setEStartsAt(e.target.value)}
                        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                      />
                      <input
                        type="datetime-local"
                        value={eEndsAt}
                        onChange={(e) => setEEndsAt(e.target.value)}
                        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                      />
                    </div>

                    <input
                      value={eLocation}
                      onChange={(e) => setELocation(e.target.value)}
                      placeholder="Location"
                      className="mb-3 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(ev.id)}
                        disabled={!hasChanges}
                        className="rounded-xl px-4 py-2 bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl bg-[var(--theme-pill-orange)] px-4 py-2 hover:bg-[var(--theme-button-hover)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </section>
                );
              }

              // VIEW card: semantic container + full-width button content
              const showDate = Boolean(ev.startsAt);
              const startD = showDate ? new Date(ev.startsAt as string) : null;
              const endD = ev.endsAt ? new Date(ev.endsAt) : null;

              return (
                <article
                  key={ev.id}
                  className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-sm"
                >
                  {/* The button spans the whole card content area */}
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`View details for event: ${ev.title || 'Untitled Event'}`}
                    onClick={() => openModal(ev)}
                    className="group block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-xl text-[var(--theme-text)] group-hover:underline underline-offset-4">
                          {ev.title || 'Untitled Event'}
                        </div>

                        {showDate && startD && (
                          <div className="text-sm opacity-80 text-[var(--theme-text)]">
                            <span className="font-semibold">Date:</span>{' '}
                            {startD.toLocaleDateString()}
                            {endD && ` – ${endD.toLocaleDateString()}`}
                          </div>
                        )}

                        {showDate && startD && (
                          <div className="text-sm opacity-80 text-[var(--theme-text)]">
                            <span className="font-semibold">Time:</span>{' '}
                            {startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {endD &&
                              ` – ${endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        )}

                        {ev.location && (
                          <div className="text-sm opacity-80 text-[var(--theme-text)]">
                            <span className="font-semibold">Location:</span> {ev.location}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm opacity-70">Click to view details</div>
                  </button>

                  {/* Admin actions live OUTSIDE the content button (no nesting) */}
                  {isAdmin && (
                    <div className="mt-3 flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(ev.id)}
                        className="rounded-lg border border-[var(--theme-border)] px-3 py-1 text-sm bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(ev.id)}
                        className="rounded-lg bg-[var(--theme-error)] px-3 py-1 text-sm text-white hover:opacity-90"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Single modal instance */}
      <EventModal open={modalOpen} event={modalEvent} onClose={closeModal} />
    </div>
  );
}

// Convert stored ISO to datetime-local input value (YYYY-MM-DDTHH:mm)
function toLocalInputValue(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yr}-${mo}-${da}T${hr}:${mi}`;
  } catch {
    return '';
  }
}
