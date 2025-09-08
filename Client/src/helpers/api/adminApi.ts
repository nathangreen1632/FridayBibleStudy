// Client/src/helpers/api/adminApi.ts
import { apiWithRecaptcha } from '../secure-api.helper'; // <-- adjust path if different

/** GET /admin/prayers (list) — returns Response (caller handles .ok/.json()) */
export async function fetchAdminPrayers(params: URLSearchParams): Promise<Response> {
  return fetch(`/api/admin/prayers?${params.toString()}`, { credentials: 'include' });
}

/** GET /admin/prayers/:id/comments (thread) — returns Response */
export async function fetchPrayerThread(prayerId: number): Promise<Response> {
  return fetch(`/api/admin/prayers/${prayerId}/comments`, { credentials: 'include' });
}

/** ✅ GET /admin/prayers/:id (detail) — returns Response (same shape as other GETs) */
// NEW / confirmed: GET detail without a request body
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


