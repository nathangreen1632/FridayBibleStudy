import { api } from './http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (!SITE_KEY) {
  // Optional: throw early in dev
  // eslint-disable-next-line no-console
  console.warn('[recaptcha] Missing VITE_RECAPTCHA_SITE_KEY');
}

/**
 * Wraps api() with reCAPTCHA Enterprise:
 * - Executes Enterprise with the given `action`
 * - Sends the token in BOTH the header and JSON body, as our server accepts either
 */
export async function apiWithRecaptcha<TResponse = unknown>(
  url: string,
  action: string,
  init?: RequestInit & { body?: any }
): Promise<TResponse> {
  if (!SITE_KEY) throw new Error('Missing VITE_RECAPTCHA_SITE_KEY');

  await loadRecaptchaEnterprise(SITE_KEY);
  const recaptchaToken = await getRecaptchaToken(SITE_KEY, action);

  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('x-recaptcha-token', recaptchaToken);

  const body =
    typeof init?.body === 'string'
      ? init.body
      : JSON.stringify({ ...(init?.body || {}), recaptchaToken });

  return api<TResponse>(url, {
    ...init,
    method: init?.method || 'POST',
    headers,
    body,
  });
}
