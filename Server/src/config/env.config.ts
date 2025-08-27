import './dotenv.config.js';
import { parseNodeEnv, req, opt, int } from '../helpers/env.helper.js';

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_COOKIE_NAME: string;
  JWT_FIXED_EXP_HOURS: number;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  GROUP_EMAIL: string;

  GOOGLE_CREDENTIALS_B64: string;

  RECAPTCHA_PROJECT_ID: string;
  RECAPTCHA_SITE_KEY: string;
  RECAPTCHA_MIN_SCORE: number;

  UPLOAD_DIR: string;
  MAX_FILE_MB: number;
  PUBLIC_URL: string;
}

export const env: Env = {
  NODE_ENV: parseNodeEnv(),

  PORT: int('PORT', 8080),
  DATABASE_URL: req('DATABASE_URL'),
  JWT_SECRET: req('JWT_SECRET'),
  JWT_COOKIE_NAME: opt('JWT_COOKIE_NAME', 'auth'),
  JWT_FIXED_EXP_HOURS: int('JWT_FIXED_EXP_HOURS', 24),
  RESEND_API_KEY: req('RESEND_API_KEY'),
  EMAIL_FROM: req('EMAIL_FROM'),
  GROUP_EMAIL: req('GROUP_EMAIL'),

  GOOGLE_CREDENTIALS_B64: opt('GOOGLE_CREDENTIALS_B64', ''),

  RECAPTCHA_PROJECT_ID: opt('RECAPTCHA_PROJECT_ID', ''),
  RECAPTCHA_SITE_KEY: opt('RECAPTCHA_SITE_KEY', ''),
  RECAPTCHA_MIN_SCORE: int('RECAPTCHA_MIN_SCORE', 0.7),

  UPLOAD_DIR: opt('UPLOAD_DIR', '/data/uploads'),
  MAX_FILE_MB: int('MAX_FILE_MB', 10),
  PUBLIC_URL: opt('PUBLIC_URL', 'http://localhost:8080'),
};
