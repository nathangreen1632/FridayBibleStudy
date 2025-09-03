// Server/src/services/recaptcha.service.ts
import { GoogleAuth, AnyAuthClient } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
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

// -----------------------------------------------------------------------------
// Service Account preparation
// -----------------------------------------------------------------------------

const DEFAULT_KEY_PATH = path.resolve(process.cwd(), 'Server/.runtime/keys/gcp-sa.json');

/**
 * Ensure the service-account JSON exists at the target path.
 * - If the file already exists: return its path.
 * - If GOOGLE_CREDENTIALS_B64 is present: mkdir -p, write the file (0600), return its path.
 * - Otherwise: log once and return null (graceful disable).
 */
async function ensureServiceAccountFile(): Promise<string | null> {
  try {
    const target = env.SERVICE_ACCOUNT_KEY_PATH && env.SERVICE_ACCOUNT_KEY_PATH.trim().length > 0
      ? env.SERVICE_ACCOUNT_KEY_PATH
      : DEFAULT_KEY_PATH;

    const dir = path.dirname(target);

    // If it exists, we're done.
    try {
      await fs.readFile(target);
      return target;
    } catch {
      // continue to try writing from B64
    }

    const b64 = env.GOOGLE_CREDENTIALS_B64;
    if (!b64 || b64.trim().length === 0) {
      console.warn('[reCAPTCHA] GOOGLE_CREDENTIALS_B64 is not set; verification will be disabled.');
      return null;
    }

    try {
      await fs.mkdir(dir, { recursive: true });
      const json = Buffer.from(b64, 'base64').toString('utf8');
      await fs.writeFile(target, json, { mode: 0o600 });
      return target;
    } catch (e) {
      console.warn('Failed to write GOOGLE_CREDENTIALS_B64 to disk:', e);
      return null;
    }
  } catch (e) {
    console.warn('Unexpected error while preparing service account file:', e);
    return null;
  }
}

// Quick visibility at startup (after attempting to ensure the file exists)
(async () => {
  try {
    const keyPath = await ensureServiceAccountFile();
    if (!keyPath) {
      console.warn('⚠️  Service account file is not present; reCAPTCHA verification will be disabled.');
      return;
    }
    const raw = await fs.readFile(keyPath, 'utf8');
    const sa = JSON.parse(raw);
    // eslint-disable-next-line no-console
    console.log('[reCAPTCHA] SA project_id:', sa.project_id, ' RECAPTCHA_PROJECT_ID:', env.RECAPTCHA_PROJECT_ID);
    if (sa.project_id !== env.RECAPTCHA_PROJECT_ID) {
      console.warn('⚠️  Service account project_id does NOT match RECAPTCHA_PROJECT_ID');
    }
  } catch (e) {
    console.warn('⚠️  Could not read service account file:', e);
  }
})();

// -----------------------------------------------------------------------------
// Verification
// -----------------------------------------------------------------------------

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

  if (!token) return defaultResult;
  if (!env.RECAPTCHA_SITE_KEY) return defaultResult;
  if (!env.RECAPTCHA_PROJECT_ID) return defaultResult;

  // Ensure the service account key exists (mkdir -p + write from B64 if necessary)
  const keyPath = await ensureServiceAccountFile();
  if (!keyPath) {
    // Graceful disable when creds aren’t available
    return defaultResult;
  }

  try {
    const auth = new GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client: AnyAuthClient = await auth.getClient();
    const access = await client.getAccessToken();
    const accessToken = access ? access.token : null;

    if (!accessToken) {
      console.error('❌ reCAPTCHA: no access token from GoogleAuth');
      return defaultResult;
    }

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

    // Explicit HTTP error logging
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('❌ reCAPTCHA HTTP error', res.status, body);
      return defaultResult;
    }

    const data = (await res.json()) as RecaptchaVerificationResponse;

    const valid = !!data.tokenProperties?.valid;
    const score = typeof data.riskAnalysis?.score === 'number' ? data.riskAnalysis.score : 0;
    const action = data.tokenProperties?.action;

    if (!valid) {
      console.error('❌ reCAPTCHA invalid token', {
        invalidReason: data.tokenProperties?.invalidReason,
        action,
        score,
      });
    }

    const isActionValid = action === expectedAction;
    const minScore = IS_PROD ? MIN_SCORE : 0.1;
    const isScoreAcceptable = valid && score >= minScore;

    return {
      success: valid,
      score,
      action,
      hostname: data.tokenProperties?.hostname,
      challenge_ts: data.tokenProperties?.createTime,
      errorCodes: data.tokenProperties?.invalidReason ? [data.tokenProperties.invalidReason] : [],
      isActionValid,
      isScoreAcceptable,
    };
  } catch (err) {
    console.error('❌ reCAPTCHA verification error:', err);
    return defaultResult;
  }
}
