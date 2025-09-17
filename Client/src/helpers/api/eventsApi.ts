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

type ListResp<T> = { data: T };

export async function fetchEvents(): Promise<EventRow[]> {
  try {
    const body = await api<ListResp<EventRow[]>>('/api/events', {
      method: 'GET',
      credentials: 'include',
    });
    return Array.isArray(body?.data) ? body.data : [];
  } catch {

    return [];
  }
}

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

    if (body?.data) return { ok: true, data: body.data as EventRow };
    return { ok: body?.ok === true };
  } catch {
    return { ok: false };
  }
}

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

    if (body?.data) return { ok: true, data: body.data as EventRow };
    return { ok: body?.ok === true };
  } catch {
    return { ok: false };
  }
}

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
