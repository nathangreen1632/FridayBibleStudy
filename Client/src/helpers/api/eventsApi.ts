// Client/src/helpers/api/eventsApi.ts
import { api, readBody } from '../http.helper';
import { apiWithRecaptcha } from '../secure-api.helper';

export type EventRow = {
  id: number;
  title: string;
  content: string;
  location?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

// ---- Response shapes expected from Server ----
type ListResp<T> = { data: T };                  // public GET /api/events → { data: items }

// ------------------------ PUBLIC (friend) ------------------------------------
// Everyone can read events (no reCAPTCHA; no admin).
export async function fetchEvents(): Promise<EventRow[]> {
  try {
    const body = await api<ListResp<EventRow[]>>('/api/events', {
      method: 'GET',
      credentials: 'include',
    });
    return Array.isArray(body?.data) ? body.data : [];
  } catch {
    // api<T> throws on !ok; fall back safely
    return [];
  }
}

// ------------------------ ADMIN (requires reCAPTCHA) ------------------------
// Create
export async function createEvent(payload: {
  title: string;
  content: string;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
}): Promise<{ ok: boolean; data?: EventRow }> {
  try {
    const res = await apiWithRecaptcha('/api/admin/events', 'admin_event_create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const { ok, body } = await readBody(res);
    if (!ok) return { ok: false };

    // Server returns { ok: true, id }. We tolerate { data } if you add it later.
    if (body?.data) return { ok: true, data: body.data as EventRow };
    return { ok: body?.ok === true };
  } catch {
    return { ok: false };
  }
}

// Update
export async function updateEvent(
  id: number,
  patch: Partial<Pick<EventRow, 'title' | 'content' | 'location' | 'startsAt' | 'endsAt'>>
): Promise<{ ok: boolean; data?: EventRow }> {
  try {
    const res = await apiWithRecaptcha(`/api/admin/events/${id}`, 'admin_event_update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    const { ok, body } = await readBody(res);
    if (!ok) return { ok: false };

    // Admin update currently returns { ok: true }.
    // If you later return the updated event, this will pick it up.
    if (body?.data) return { ok: true, data: body.data as EventRow };
    return { ok: body?.ok === true };
  } catch {
    return { ok: false };
  }
}

// Delete
export async function deleteEvent(id: number): Promise<boolean> {
  try {
    const res = await apiWithRecaptcha(`/api/admin/events/${id}`, 'admin_event_delete', {
      method: 'DELETE',
      credentials: 'include',
    });

    const { ok, body } = await readBody(res);
    if (!ok) return false;

    if (body?.ok === true) return true;
    return typeof body?.deletedId === 'number';
  } catch {
    return false;
  }
}

// Email an event to roster (admins only; uses reCAPTCHA)
export async function emailEvent(id: number): Promise<boolean> {
  try {
    const res = await apiWithRecaptcha(`/api/admin/events/${id}/email`, 'admin_event_email', {
      method: 'POST',
      credentials: 'include',
    });

    const { ok, body } = await readBody(res);
    if (!ok) return false;
    return body?.ok === true;
  } catch {
    return false;
  }
}
