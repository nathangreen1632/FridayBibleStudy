// Client/src/helpers/api/adminApi.ts
export async function fetchAdminPrayers(params: URLSearchParams): Promise<Response> {
  return fetch(`/api/admin/prayers?${params.toString()}`, { credentials: 'include' });
}

export async function fetchPrayerThread(prayerId: number): Promise<Response> {
  return fetch(`/api/admin/prayers/${prayerId}/comments`, { credentials: 'include' });
}

export async function postAdminComment(prayerId: number, content: string, recaptchaToken?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;
  return fetch(`/api/admin/prayers/${prayerId}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ content, recaptchaToken }),
  });
}

export async function patchPrayerStatus(prayerId: number, status: 'active' | 'praise' | 'archived', recaptchaToken?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;
  return fetch(`/api/admin/prayers/${prayerId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: JSON.stringify({ status, recaptchaToken }),
  });
}
