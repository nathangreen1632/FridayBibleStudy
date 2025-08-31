// Client/src/helpers/secure-api.helper.ts
import { api } from './http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

/**
 * Wraps `api` and automatically attaches an x-recaptcha-token header
 * for the given action. Safe in dev: if no SITE_KEY or a token can't be
 * fetched, it gracefully sends the request without the header.
 *
 * IMPORTANT:
 * - We DO NOT mutate the request body. Some routes expect exact JSON.
 * - We only add the header if we successfully obtain a token.
 * - Header merging preserves any headers the caller provided.
 */
export async function apiWithRecaptcha<T = unknown>(
  input: RequestInfo,
  action: string,
  init?: RequestInit
): Promise<T> {
  let token: string | undefined;

  if (SITE_KEY) {
    try {
      // Ensure the enterprise script is loaded (idempotent in our lib)
      await loadRecaptchaEnterprise(SITE_KEY);
      token = await getRecaptchaToken(SITE_KEY, action);
    } catch {
      // Non-fatal in dev/local: continue without token
      token = undefined;
    }
  }

  // Merge headers without clobbering defaults OR the token
  // (http.helper adds Content-Type: application/json afterwards)
  const mergedHeaders: HeadersInit = {
    ...(init?.headers ?? {}),
    ...(token ? { 'x-recaptcha-token': token } : {}),
  };

  return api<T>(input, { ...init, headers: mergedHeaders });
}
