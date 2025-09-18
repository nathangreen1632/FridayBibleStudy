import { humanizeError } from './error.helper';

export type ResetPayload = {
  email: string;
  otp: string;
  newPassword: string;
};

export type ResetResult = { ok: true } | { ok: false; message: string };

export function buildResetRequestInit(payload: ResetPayload): RequestInit {
  return {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      otp: payload.otp,
      newPassword: payload.newPassword,
    }),
  };
}

export function parseResetResponse(res: unknown): ResetResult {
  if (res && typeof res === 'object' && 'ok' in res) {
    const okVal = (res as { ok?: unknown }).ok;
    if (okVal === true) return { ok: true };
  }

  let message = 'Please verify the one-time code is correct.';

  if (res && typeof res === 'object' && 'error' in res) {
    const raw = (res as { error?: unknown }).error;
    message = humanizeError(raw, message);
    return { ok: false, message };
  }

  return { ok: false, message };
}

export async function submitResetPassword(
  apiWithRecaptcha: (
    url: string,
    action: string,
    init?: RequestInit
  ) => Promise<unknown>,
  payload: ResetPayload
): Promise<ResetResult> {
  try {
    const init = buildResetRequestInit(payload);
    const res = await apiWithRecaptcha('/api/auth/reset-password', 'password_reset', init);
    return parseResetResponse(res);
  } catch {
    return { ok: false, message: 'Network error while resetting password.' };
  }
}
