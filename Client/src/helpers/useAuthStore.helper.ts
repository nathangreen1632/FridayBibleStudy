import {api} from './http.helper';
import {getRecaptchaToken, loadRecaptchaEnterprise} from '../lib/recaptcha.lib';

export type AuthResult = { success: boolean; message?: string };

export function requireSiteKey(siteKey: string | undefined): AuthResult | null {
  if (siteKey) return null;
  return { success: false, message: 'Missing reCAPTCHA site key. Please contact the administrator.' };
}

export async function loadRecaptchaOrError(siteKey: string): Promise<AuthResult | null> {
  try {
    await loadRecaptchaEnterprise(siteKey);
    return null;
  } catch {
    return {
      success: false,
      message: 'Security check unavailable (reCAPTCHA load failed). Please try again later.',
    };
  }
}

export async function getLoginTokenOrError(siteKey: string): Promise<
  | { ok: true; token: string }
  | { ok: false; message: string }
> {
  try {
    const token = await getRecaptchaToken(siteKey, 'login');
    return { ok: true, token };
  } catch {
    return {
      ok: false,
      message: 'Security token could not be created. Please refresh and try again.',
    };
  }
}

export async function performLoginRequest(
  email: string,
  password: string,
  recaptchaToken: string
): Promise<Response> {
  return api<Response>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-recaptcha-token': recaptchaToken,
    },
    body: JSON.stringify({ email, password, recaptchaToken }),
  });
}

export async function responseErrorMessageIfAny(res: Response): Promise<string | null> {
  if (res.ok) return null;

  let message = 'Login failed';

  try {
    const cloned = res.clone();
    const parsed: unknown = await cloned.json();
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const val = (parsed as { error?: unknown }).error;
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object' && 'message' in (val as any) && typeof (val as any).message === 'string') {
        return (val as any).message as string;
      }
      try {
        return JSON.stringify(val);
      } catch {

      }
    }
  } catch {

  }

  try {
    const text = await res.text();
    if (text) message = text;
  } catch {

  }

  return message;
}

export async function fetchMeSafe<TUser = unknown>(): Promise<TUser | null> {
  try {
    return await api<TUser>('/api/auth/me', {method: 'GET'});
  } catch {
    return null;
  }
}
