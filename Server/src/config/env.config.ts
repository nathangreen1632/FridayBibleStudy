// Server/src/config/env.config.ts
import './dotenv.config.js';

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
  RECAPTCHA_PROJECT_ID?: string;
  RECAPTCHA_SITE_KEY?: string;
  RECAPTCHA_SECRET?: string;
  UPLOAD_DIR: string;
  MAX_FILE_MB: number;
  PUBLIC_URL: string;
}

function req(name: keyof Env | string): string {
  const v = process.env[String(name)];
  if (!v) throw new Error(`Missing env: ${String(name)}`);
  return v;
}
function int(name: keyof Env | string, def?: number): number {
  const raw = process.env[String(name)];
  if (raw == null || raw === '') {
    if (def === undefined) throw new Error(`Missing env: ${String(name)}`);
    return def;
  }
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Env ${String(name)} must be a number`);
  return n;
}

export const env: Env = {
  NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) ?? 'development',
  PORT: int('PORT', 8080),
  DATABASE_URL: req('DATABASE_URL'),
  JWT_SECRET: req('JWT_SECRET'),
  JWT_COOKIE_NAME: process.env.JWT_COOKIE_NAME ?? 'auth',
  JWT_FIXED_EXP_HOURS: int('JWT_FIXED_EXP_HOURS', 24),
  RESEND_API_KEY: req('RESEND_API_KEY'),
  EMAIL_FROM: req('EMAIL_FROM'),
  GROUP_EMAIL: req('GROUP_EMAIL'),
  RECAPTCHA_PROJECT_ID: process.env.RECAPTCHA_PROJECT_ID,
  RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
  RECAPTCHA_SECRET: process.env.RECAPTCHA_SECRET,
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? '/data/uploads',
  MAX_FILE_MB: int('MAX_FILE_MB', 10),
  PUBLIC_URL: process.env.PUBLIC_URL ?? 'http://localhost:8080'
};
