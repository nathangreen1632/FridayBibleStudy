// Client/src/helpers/api/adminApi.ts
import { apiWithRecaptcha } from '../secure-api.helper'; // <-- adjust path if different
import type { RosterSortField } from '../../stores/admin/useAdminStore';

type RosterPatch = Partial<{
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;

  // NEW: pause/unpause
  emailPaused: boolean;
}>;

/** GET /admin/prayers (list) — returns Response (caller handles .ok/.json()) */
export async function fetchAdminPrayers(params: URLSearchParams): Promise<Response> {
  return fetch(`/api/admin/prayers?${params.toString()}`, { credentials: 'include' });
}

/** GET /admin/prayers/:id/comments (thread) — returns Response */
export async function fetchPrayerThread(prayerId: number): Promise<Response> {
  return fetch(`/api/admin/prayers/${prayerId}/comments`, { credentials: 'include' });
}

/** ✅ GET /admin/prayers/:id (detail) — returns Response (same shape as other GETs) */
export async function fetchPrayerDetail(
  prayerId: number,
  recaptchaToken?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;

  return fetch(`/api/admin/prayers/${prayerId}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
}

/** POST comment — keep Response shape; attach recaptcha header when available */
export async function postAdminComment(
  prayerId: number,
  content: string,
): Promise<Response> {
  return apiWithRecaptcha(
    `/api/admin/prayers/${prayerId}/comments`,
    'admin_post_comment',
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    }
  );
}

/** PATCH status — keep Response shape; attach recaptcha header when available */
export async function patchPrayerStatus(
  prayerId: number,
  status: 'active' | 'praise' | 'archived',
): Promise<Response> {
  return apiWithRecaptcha(
    `/api/admin/prayers/${prayerId}/status`,
    'admin_patch_status',
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

/** DELETE /admin/prayers/:id — keep Response shape; attach recaptcha header when available */
export async function deleteAdminPrayer(prayerId: number): Promise<Response> {
  return apiWithRecaptcha(
    `/api/admin/prayers/${prayerId}`,
    'admin_prayer_delete',
    {
      method: 'DELETE',
    }
  );
}

/**
 * UPDATED: add sortBy/sortDir (no breaking changes).
 * Builds a querystring with q, page, pageSize, sortBy, sortDir.
 * Returns server JSON or a graceful { ok:false, ... } object on failure.
 */
export async function fetchAdminRoster(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: RosterSortField;
  sortDir?: 'asc' | 'desc';
}) {
  const u = new URL('/api/admin/roster', window.location.origin);

  if (typeof params.q === 'string') u.searchParams.set('q', params.q);
  if (typeof params.page === 'number') u.searchParams.set('page', String(params.page));
  if (typeof params.pageSize === 'number') u.searchParams.set('pageSize', String(params.pageSize));
  if (typeof params.sortBy === 'string') u.searchParams.set('sortBy', params.sortBy);
  if (params.sortDir === 'asc' || params.sortDir === 'desc') u.searchParams.set('sortDir', params.sortDir);

  try {
    const res = await fetch(u.toString(), { credentials: 'include' });
    if (!res.ok) {
      return { ok: false, rows: [], total: 0, page: 1, pageSize: 25, message: 'Request failed.' };
    }
    return res.json();
  } catch {
    return { ok: false, rows: [], total: 0, page: 1, pageSize: 25, message: 'Network error.' };
  }
}

export async function postDigestPreview(payload: { groupId: number; days?: number }) {
  try {
    const res = await fetch('/api/admin/digests/preview', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, updates: [], error: 'Request failed.' };
    return res.json();
  } catch {
    return { ok: false, updates: [], error: 'Network error.' };
  }
}

export async function postDigestSendAuto(payload: { groupId: number; days?: number; subject?: string; threadMessageId?: string | null }) {
  try {
    const res = await fetch('/api/admin/digests/send-auto', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, error: 'Send failed.' };
    return res.json();
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}

export async function postDigestSendManual(payload: { groupId: number; updateIds: number[]; subject?: string; threadMessageId?: string | null }) {
  try {
    const res = await fetch('/api/admin/digests/send-manual', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, error: 'Send failed.' };
    return res.json();
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}

export async function patchAdminRosterUser(
  id: number,
  patch: RosterPatch
): Promise<{ ok: boolean; row?: unknown; error?: string }> {
  try {
    const res = await fetch(`/api/admin/roster/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      let error = 'Update failed.';
      try {
        const data = await res.json();
        if (data?.error) error = String(data.error);
      } catch {}
      return { ok: false, error };
    }

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // best-effort; server should send JSON but we won’t crash if not
    }
    // pass-through; the store merges row safely
    return (data && typeof data === 'object' ? (data as any) : { ok: true }) as {
      ok: boolean; row?: unknown; error?: string;
    };
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}

export async function deleteAdminRosterUser(id: number) {
  try {
    const res = await fetch(`/api/admin/roster/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return { ok: false, error: 'Delete failed.' };
    return res.json();
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}
