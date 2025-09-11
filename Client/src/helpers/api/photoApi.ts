// Client/src/helpers/api/photoApi.ts

type UploadOptions = {
  prayerId?: number;
  recaptchaToken?: string;
  note?: string; // ✅ new: optional footer note for this batch
};

/* Client-side API for Photos, aligned with your existing fetch style.
   - Graceful errors only; no throws
   - Optional reCAPTCHA header (x-recaptcha-token)
*/
export async function fetchPhotos(
  page = 1,
  pageSize = 25,
  recaptchaToken?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;

  return fetch(`/api/photos?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
}

export async function uploadPhotos(files: File[], opts: UploadOptions = {}): Promise<Response> {
  const form = new FormData();
  for (const f of files) form.append('files', f);

  if (typeof opts.prayerId === 'number' && opts.prayerId > 0) {
    form.append('prayerId', String(opts.prayerId));
  }

  // ✅ append note if provided (trimmed)
  if (typeof opts.note === 'string') {
    const trimmed = opts.note.trim();
    if (trimmed.length > 0) form.append('note', trimmed);
  }

  // IMPORTANT: do NOT set Content-Type here; the browser will add the multipart boundary
  const headers: Record<string, string> = {};
  if (opts.recaptchaToken) headers['x-recaptcha-token'] = opts.recaptchaToken;

  return fetch('/api/photos', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: form,
  });
}

export async function deletePhoto(photoId: number, recaptchaToken?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken;

  return fetch(`/api/photos/${photoId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
}
