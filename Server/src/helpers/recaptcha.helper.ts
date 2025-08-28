// Server/src/helpers/recaptcha.helper.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyRecaptchaToken, type RecaptchaVerificationResult } from '../services/recaptcha.service.js';

export async function verifyAndGateRecaptcha(
  req: Request, res: Response, next: NextFunction, expectedAction: string, token: string
): Promise<void> {
  let result: RecaptchaVerificationResult;
  try {
    result = await verifyRecaptchaToken(token, expectedAction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
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
