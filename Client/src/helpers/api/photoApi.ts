// Client/src/helpers/api/photoApi.ts

type UploadOptions = { prayerId?: number; recaptchaToken?: string };

/* Client-side API for Photos, aligned with your existing fetch style.
   - Graceful errors only; no throws
   - Optional reCAPTCHA header (x-recaptcha-token)
*/
export async function fetchPhotos(
  page = 1,
  pageSize = 24,
  recaptchaToken?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;

  return fetch(`/api/photos?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    credentials: 'include',
    headers
  });
}

export async function uploadPhotos(files: File[], opts: UploadOptions = {}) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  if (typeof opts.prayerId === 'number') form.append('prayerId', String(opts.prayerId));

  const headers: Record<string, string> = {};
  if (opts.recaptchaToken) headers['x-recaptcha-token'] = opts.recaptchaToken;

  return fetch('/api/photos', { method: 'POST', credentials: 'include', headers, body: form });
}


export async function deletePhoto(
  photoId: number,
  recaptchaToken?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;

  return fetch(`/api/photos/${photoId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers
  });
}
