// Client/src/helpers/secure-api.helper.ts
import { api } from './http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export async function apiWithRecaptcha<T = unknown>(
  url: string,
  action: string,
  init?: RequestInit
): Promise<T> {
  if (!SITE_KEY) throw new Error('Missing VITE_RECAPTCHA_SITE_KEY');

  await loadRecaptchaEnterprise(SITE_KEY);
  const recaptchaToken = await getRecaptchaToken(SITE_KEY, action);

  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('x-recaptcha-token', recaptchaToken);

  // If body is an object, stringify it here (nice DX)
  let body = init?.body as any;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify({ ...body, recaptchaToken });
  } else if (!body) {
    body = JSON.stringify({ recaptchaToken });
  }

  return api<T>(url, { ...init, headers, body });
}
