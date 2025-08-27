// Server/src/services/recaptcha.service.ts
import { AnyAuthClient, GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import '../config/dotenv.config.js';
import { env } from '../config/env.config.js';

/** Response fragments per reCAPTCHA Enterprise API */
export interface RecaptchaVerificationResponse {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    action?: string;
    hostname?: string;
    createTime?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
}

export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  errorCodes: string[];
  isActionValid: boolean;
  isScoreAcceptable: boolean;
}

const PROJECT_ID: string = (env as any)?.RECAPTCHA_PROJECT_ID || '';
const SITE_KEY: string   = (env as any)?.RECAPTCHA_SITE_KEY || '';
const MIN_SCORE: number  = (() => {
  const raw = (env as any)?.RECAPTCHA_MIN_SCORE;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0.5;
})();
const IS_PROD: boolean = process.env.NODE_ENV === 'production';

/**
 * If you provide GOOGLE_CREDENTIALS_B64 and SERVICE_ACCOUNT_KEY_PATH,
 * we will decode and write the key file (chmod 600).
 */
const SERVICE_ACCOUNT_KEY_PATH: string = (env as any)?.SERVICE_ACCOUNT_KEY_PATH || '/tmp/recaptcha-sa.json';
const GOOGLE_CREDENTIALS_B64: string | undefined = (env as any)?.GOOGLE_CREDENTIALS_B64;

(async (): Promise<void> => {
  if (GOOGLE_CREDENTIALS_B64) {
    try {
      const buffer = Buffer.from(GOOGLE_CREDENTIALS_B64, 'base64');
      await fs.writeFile(SERVICE_ACCOUNT_KEY_PATH, buffer, { mode: 0o600 });
    } catch (err) {
      console.error('❌ Failed to write service account key file:', err);
    }
  } else {
    // Not fatal for local dev if your keyFile already exists on disk
    // but warn so you know why OAuth might fail.
    console.warn('⚠️ GOOGLE_CREDENTIALS_B64 not set (ensure key file exists at SERVICE_ACCOUNT_KEY_PATH)');
  }
})();

const auth = new GoogleAuth({
  keyFile: SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string
): Promise<RecaptchaVerificationResult> {
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

  if (!token || !SITE_KEY || !PROJECT_ID) {
    console.warn('⚠️ reCAPTCHA verification skipped due to missing config:', {
      tokenProvided: !!token,
      siteKeySet: !!SITE_KEY,
      projectIdSet: !!PROJECT_ID,
    });
    return defaultResult;
  }

  try {
    const client: AnyAuthClient = await auth.getClient();
    const { token: accessToken } = (await client.getAccessToken()) || {};
    if (!accessToken) {
      console.error('❌ Failed to acquire Google access token for reCAPTCHA Enterprise');
      return defaultResult;
    }

    const apiUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: {
          token,
          siteKey: SITE_KEY,
          expectedAction,
        },
      }),
    });

    if (!response.ok) {
      console.error('🚫 reCAPTCHA API error:', response.status, response.statusText);
      return defaultResult;
    }

    const data = (await response.json()) as RecaptchaVerificationResponse;

    const success = !!data.tokenProperties?.valid;
    const score = data.riskAnalysis?.score;
    const action = data.tokenProperties?.action;
    const hostname = data.tokenProperties?.hostname;
    const challenge_ts = data.tokenProperties?.createTime;
    const errorCodes = data.tokenProperties?.invalidReason
      ? [data.tokenProperties.invalidReason]
      : [];

    const isActionValid = action === expectedAction;
    const threshold = IS_PROD ? MIN_SCORE : 0.1; // looser in dev
    const isScoreAcceptable = success && (score ?? 0) >= threshold;

    return {
      success,
      score,
      action,
      hostname,
      challenge_ts,
      errorCodes,
      isActionValid,
      isScoreAcceptable,
    };
  } catch (err) {
    console.error('❌ Unexpected error during reCAPTCHA verification:', err);
    return defaultResult;
  }
}
