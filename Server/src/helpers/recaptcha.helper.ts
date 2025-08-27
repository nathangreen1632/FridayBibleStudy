import type { Request, Response, NextFunction } from 'express';
import { verifyRecaptchaToken } from '../services/recaptcha.service.js';
import type { RecaptchaVerificationResult } from '../services/recaptcha.service.js';

/**
 * Runs Enterprise verification and gates the request.
 * On success: attaches (req as any).recaptcha and calls next()
 * On failure: sends the appropriate HTTP response and returns.
 */
export async function verifyAndGateRecaptcha(
  req: Request,
  res: Response,
  next: NextFunction,
  expectedAction: string,
  token: string
): Promise<void> {
  let result: RecaptchaVerificationResult;

  try {
    result = await verifyRecaptchaToken(token, expectedAction);
  } catch (err: unknown) {
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'string') {
      message = err;
    } else {
      message = 'Unknown error during CAPTCHA verification';
    }
    res.status(500).json({ error: 'CAPTCHA verification error', message });
    return;
  }

  if (!result.success) {
    res.status(403).json({ error: 'CAPTCHA failed', details: result.errorCodes });
    return;
  }
  if (!result.isScoreAcceptable) {
    res.status(403).json({ error: 'CAPTCHA score too low', score: result.score });
    return;
  }
  if (!result.isActionValid) {
    res.status(400).json({
      error: 'CAPTCHA action mismatch',
      expected: expectedAction,
      actual: result.action,
    });
    return;
  }

  (req as any).recaptcha = {
    score: result.score,
    action: result.action,
    hostname: result.hostname,
    challenge_ts: result.challenge_ts,
  };

  next();
}
