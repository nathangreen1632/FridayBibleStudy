// Client/src/helpers/secure-api.helper.ts
import { api } from './http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export async function apiWithRecaptcha<T = unknown>(
  url: string,
  action: string,
  init?: RequestInit
): Promise<T> {
  // Reject with an Error object to satisfy Sonar (S6671)
  if (!SITE_KEY) {
    return Promise.reject(new Error('Missing VITE_RECAPTCHA_SITE_KEY'));
  }

  try {
    await loadRecaptchaEnterprise(SITE_KEY);
    const recaptchaToken = await getRecaptchaToken(SITE_KEY, action);

    // Headers
    const headers = new Headers(init?.headers);
    headers.set('x-recaptcha-token', recaptchaToken);

    // Prepare body with correct typing
    const originalBody = init?.body;
    let body: BodyInit | null | undefined = originalBody;

    try {
      const maybeJson = originalBody as unknown;
      if (maybeJson && typeof maybeJson === 'object' && !(maybeJson instanceof FormData)) {
        // Merge token into JSON body
        body = JSON.stringify({
          ...(maybeJson as Record<string, unknown>),
          recaptchaToken,
        });
      } else if (!originalBody) {
        // No body provided → send token-only JSON
        body = JSON.stringify({ recaptchaToken });
      }
    } catch {
      // keep original body on any failure
      body = originalBody;
    }

    // Only set JSON content-type when body is a string we created
    if (typeof body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return await api<T>(url, { ...init, headers, body });
  } catch (e) {
    // Reject with Error object (S6671 compliant)
    const err = e instanceof Error ? e : new Error(String(e));
    return Promise.reject(err);
  }
}
