// Server/src/services/recaptcha.service.ts
import { GoogleAuth, AnyAuthClient } from 'google-auth-library';
import fs from 'fs/promises';
import { env } from '../config/env.config.js';

export type RecaptchaVerificationResponse = {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    hostname?: string;
    action?: string;
    createTime?: string;
  };
  riskAnalysis?: { score?: number; reasons?: string[] };
};

export type RecaptchaVerificationResult = {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  errorCodes: string[];
  isActionValid: boolean;
  isScoreAcceptable: boolean;
};

/** New: call signature for the service */
export type VerifyRecaptchaOptions = {
  token: string;
  expectedAction: string;
  ip?: string;         // optional: forwarded to Google
  userAgent?: string;  // optional: forwarded to Google
};

const IS_PROD = env.NODE_ENV === 'production';
const MIN_SCORE = env.RECAPTCHA_MIN_SCORE;

// Ensure service-account JSON is present on disk when provided via B64
(async () => {
  if (env.GOOGLE_CREDENTIALS_B64) {
    try {
      const buf = Buffer.from(env.GOOGLE_CREDENTIALS_B64, 'base64');
      await fs.writeFile(env.SERVICE_ACCOUNT_KEY_PATH, buf, { mode: 0o600 });
    } catch (e) {
      console.error('❌ Failed to write GOOGLE_CREDENTIALS_B64 to disk:', e);
    }
  }
})();

const auth = new GoogleAuth({
  keyFile: env.SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

/**
 * Verify a reCAPTCHA Enterprise token against Google.
 * Accepts an options object so callers can pass ip/userAgent without breaking.
 */
export async function verifyRecaptchaToken(
  opts: VerifyRecaptchaOptions
): Promise<RecaptchaVerificationResult> {
  const { token, expectedAction, ip, userAgent } = opts;

  const defaultResult: RecaptchaVerificationResult = {
    success: false,
    score: undefined,
    action: undefined,
    hostname: undefined,
    challenge_ts: undefined,
    errorCodes: [],
    isActionValid: false,
    isScoreAcceptable: false,
  };

  if (!token || !env.RECAPTCHA_SITE_KEY || !env.RECAPTCHA_PROJECT_ID) {
    return defaultResult;
  }

  try {
    const client: AnyAuthClient = await auth.getClient();
    const { token: accessToken } = (await client.getAccessToken()) || {};
    if (!accessToken) return defaultResult;

    const apiUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${env.RECAPTCHA_PROJECT_ID}/assessments`;

    // Build the event payload; include ip / UA only when present
    const event: Record<string, unknown> = {
      token,
      siteKey: env.RECAPTCHA_SITE_KEY,
      expectedAction,
    };
    if (ip) event.userIpAddress = ip;
    if (userAgent) event.userAgent = userAgent;

    const init: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event }),
    };

    const res = await fetch(apiUrl, init);
    if (!res.ok) return defaultResult;

    const data = (await res.json()) as RecaptchaVerificationResponse;

    const valid = !!data.tokenProperties?.valid;
    const score = data.riskAnalysis?.score ?? 0;
    const action = data.tokenProperties?.action;

    return {
      success: valid,
      score,
      action,
      hostname: data.tokenProperties?.hostname,
      challenge_ts: data.tokenProperties?.createTime,
      errorCodes: data.tokenProperties?.invalidReason ? [data.tokenProperties.invalidReason] : [],
      isActionValid: action === expectedAction,
      isScoreAcceptable: valid && score >= (IS_PROD ? MIN_SCORE : 0.1),
    };
  } catch (err) {
    console.error('❌ reCAPTCHA verification error:', err);
    return defaultResult;
  }
}
