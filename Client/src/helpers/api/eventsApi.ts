// Client/src/helpers/api/eventsApi.ts
import { api } from '../http.helper'; // ⬅️ no .ts extension

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
type ListResp<T> = { data: T };
type ItemResp<T> = { data: T; ok?: boolean };
type OkResp = { ok: boolean; deletedId?: number };

export async function fetchEvents(): Promise<EventRow[]> {
  try {
    const body = await api<ListResp<EventRow[]>>('/api/events', {
      credentials: 'include',
    });
    return Array.isArray(body?.data) ? body.data : [];
  } catch {
    // api<T> throws on !ok; we fall back safely
    return [];
  }
}

export async function createEvent(payload: {
  title: string;
  content: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
}): Promise<{ ok: boolean; data?: EventRow }> {
  try {
    const body = await api<ItemResp<EventRow>>('/api/admin/events', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return { ok: true, data: body?.data };
  } catch {
    return { ok: false };
  }
}

export async function updateEvent(
  id: number,
  patch: Partial<Pick<EventRow, 'title' | 'content' | 'location' | 'startsAt' | 'endsAt'>>
): Promise<{ ok: boolean; data?: EventRow }> {
  try {
    const body = await api<ItemResp<EventRow>>(`/api/admin/events/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    return { ok: true, data: body?.data };
  } catch {
    return { ok: false };
  }
}

export async function deleteEvent(id: number): Promise<boolean> {
  try {
    const body = await api<OkResp>(`/api/admin/events/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    // accept either ok flag or presence of deletedId
    if (body?.ok === true) return true;
    return typeof body?.deletedId === 'number';

  } catch {
    return false;
  }
}
