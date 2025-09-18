import {getRecaptchaToken, loadRecaptchaEnterprise} from '../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

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

        token = null;
      }
    }

    const mergedHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    };

    if (token) {
      (mergedHeaders as Record<string, string>)['x-recaptcha-token'] = token;
    }

    return await fetch(input, {
      credentials: 'include',
      ...init,
      headers: mergedHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Network error' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
