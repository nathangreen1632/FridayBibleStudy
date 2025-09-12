// Client/src/pages/EventsPage.tsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore';

type EventRow = {
  id: number;
  title: string;
  content: string;
  location?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

export default function EventsPage(): React.ReactElement {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/events', { credentials: 'include' })
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) {
          setItems(Array.isArray(body?.data) ? body.data : []);
        }
      })
      .catch(() => toast.error('Unable to load events'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, startsAt, location }),
      });

      if (!res.ok) {
        toast.error('Create failed');
        return;
      }

      // Reset form
      setTitle('');
      setContent('');
      setStartsAt('');
      setLocation('');

      // Reload events
      const r = await fetch('/api/events', { credentials: 'include' });
      const body = await r.json();
      setItems(Array.isArray(body?.data) ? body.data : []);

      toast.success('Event created');
    } catch {
      toast.error('Network error');
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4">
      <h1 className="mb-3 text-2xl font-extrabold">Events</h1>

      {isAdmin && (
        <form
          onSubmit={createEvent}
          className="mb-4 flex flex-col gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3"
        >
          <div className="font-semibold">Create Event</div>

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

          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
          />

          <div className="flex justify-end">
            <button className="rounded-xl bg-[var(--theme-button)] px-4 py-2 text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)]">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <ul className="divide-y divide-[var(--theme-border)]">
          {loading && <li className="p-3">Loading…</li>}
          {!loading && items.length === 0 && (
            <li className="p-3">No events yet.</li>
          )}
          {items.map((ev) => (
            <li key={ev.id} className="p-3">
              <div className="font-semibold">{ev.title}</div>

              {ev.startsAt && (
                <div className="text-sm opacity-80">
                  {new Date(ev.startsAt).toLocaleString()}
                </div>
              )}

              {ev.location && (
                <div className="text-sm opacity-80">{ev.location}</div>
              )}

              <div className="mt-2 whitespace-pre-wrap">{ev.content}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
