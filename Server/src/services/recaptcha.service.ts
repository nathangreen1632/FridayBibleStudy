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

export type VerifyRecaptchaOptions = {
  token: string;
  expectedAction: string;
  ip?: string;
  userAgent?: string;
};

const IS_PROD = env.NODE_ENV === 'production';
const MIN_SCORE = env.RECAPTCHA_MIN_SCORE;

const DEFAULT_KEY_PATH = path.resolve(process.cwd(), 'Server/.runtime/keys/gcp-sa.json');

async function ensureServiceAccountFile(): Promise<string | null> {
  try {
    const target = env.SERVICE_ACCOUNT_KEY_PATH && env.SERVICE_ACCOUNT_KEY_PATH.trim().length > 0
      ? env.SERVICE_ACCOUNT_KEY_PATH
      : DEFAULT_KEY_PATH;

    const dir = path.dirname(target);

    try {
      await fs.readFile(target);
      return target;
    } catch {

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
    if (sa.project_id !== env.RECAPTCHA_PROJECT_ID) {
      console.warn('⚠️  Service account project_id does NOT match RECAPTCHA_PROJECT_ID');
    }
  } catch (e) {
    console.warn('⚠️  Could not read service account file:', e);
  }
})();

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

  const keyPath = await ensureServiceAccountFile();
  if (!keyPath) {
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
