// Server/src/config/env.config.ts
import path from 'path';
import './dotenv.config.js';
import { parseNodeEnv, req, opt, int } from '../helpers/env.helper.js';

const DEFAULT_SA_PATH = path.join(process.cwd(), '.runtime', 'keys', 'gcp-sa.json');

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;

  GROUP_NAME: string;
  GROUP_SLUG: string;
  MIGRATE_FROM_GROUP_SLUG: string;

  JWT_SECRET: string;
  JWT_COOKIE_NAME: string;
  JWT_FIXED_EXP_HOURS: number;

  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  GROUP_EMAIL: string;
  ADMIN_EMAIL: string;
  AUDIT_CC: string;

  RECAPTCHA_PROJECT_ID: string;
  RECAPTCHA_SITE_KEY: string;
  RECAPTCHA_MIN_SCORE: number;

  GOOGLE_CREDENTIALS_B64: string;
  SERVICE_ACCOUNT_KEY_PATH: string;

  UPLOAD_DIR: string;
  MAX_FILE_MB: number;
  PUBLIC_URL: string;

  BIBLE_API_KEY: string;
  BIBLE_DEFAULT_BIBLE_ID: string;

  /** Comma-separated list of emails to auto-elevate to admin on login */
  ADMIN_EMAILS: string;
}

export const env: Env = {
  NODE_ENV: parseNodeEnv(),
  PORT: int('PORT', 3001),
  DATABASE_URL: req('DATABASE_URL'),

  GROUP_NAME: opt('GROUP_NAME', 'Friday Bible Study'),
  GROUP_SLUG: opt('GROUP_SLUG', 'friday-bible-study'),
  MIGRATE_FROM_GROUP_SLUG: opt('MIGRATE_FROM_GROUP_SLUG', ''),

  JWT_SECRET: req('JWT_SECRET'),
  JWT_COOKIE_NAME: opt('JWT_COOKIE_NAME', 'auth'),
  JWT_FIXED_EXP_HOURS: int('JWT_FIXED_EXP_HOURS', 24),

  RESEND_API_KEY: req('RESEND_API_KEY'),
  EMAIL_FROM: req('EMAIL_FROM'),
  GROUP_EMAIL: req('GROUP_EMAIL'),
  ADMIN_EMAIL: req('ADMIN_EMAIL'),
  AUDIT_CC: req('AUDIT_CC'),

  RECAPTCHA_PROJECT_ID: opt('RECAPTCHA_PROJECT_ID', ''),
  RECAPTCHA_SITE_KEY: opt('RECAPTCHA_SITE_KEY', ''),
  RECAPTCHA_MIN_SCORE: int('RECAPTCHA_MIN_SCORE', 0.7),

  GOOGLE_CREDENTIALS_B64: opt('GOOGLE_CREDENTIALS_B64', ''),
  SERVICE_ACCOUNT_KEY_PATH: opt('SERVICE_ACCOUNT_KEY_PATH', DEFAULT_SA_PATH),

  UPLOAD_DIR: opt('UPLOAD_DIR', './uploads'),
  MAX_FILE_MB: int('MAX_FILE_MB', 10),
  PUBLIC_URL: opt('PUBLIC_URL', 'http://localhost:3001'),

  BIBLE_API_KEY: opt('BIBLE_API_KEY', ''),
  BIBLE_DEFAULT_BIBLE_ID: opt('BIBLE_DEFAULT_BIBLE_ID', ''),

  // NEW: list of bootstrap admin emails
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? '',
};
