// Client/src/helpers/secure-api.helper.ts
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

/**
 * Wraps fetch and, when possible, attaches an x-recaptcha-token header for the given action.
 * Completely safe: if SITE_KEY is missing or a token can’t be fetched, it sends the request
 * without the header. It NEVER throws; always returns a Response.
 *
 * Notes:
 * • We DO NOT mutate the request body.
 * • We only add the header if we successfully obtain a token.
 * • Header merging preserves any headers the caller provided.
 */
export async function apiWithRecaptcha(
  input: RequestInfo,
  action: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    let token: string | null = null;

    if (SITE_KEY) {
      try {
        await loadRecaptchaEnterprise(SITE_KEY);
        token = await getRecaptchaToken(SITE_KEY, action);
      } catch {
        // Graceful fallback: proceed without a token
        token = null;
      }
    }

    // Merge headers but keep caller-provided headers intact
    const mergedHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    };

    if (token) {
      // add only if we actually have it
      (mergedHeaders as Record<string, string>)['x-recaptcha-token'] = token;
    }

    const res = await fetch(input, {
      credentials: 'include',
      ...init,
      headers: mergedHeaders,
    });

    // Never throw; pass the Response back to the caller to handle .ok/.json()
    return res;
  } catch {
    // Network or other unexpected failure: return a synthetic Response so callers don’t crash
    return new Response(
      JSON.stringify({ error: 'Network error' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
