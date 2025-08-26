import dotenv, { DotenvConfigOutput } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

const isRender: boolean = process.env.RENDER !== undefined;
const envPath: string = path.resolve(__dirname, '../../.env');

if (!isRender) {
  const result: DotenvConfigOutput = dotenv.config({ path: envPath });

  if (result.error) {
    const env: string = process.env.NODE_ENV ?? 'development';
    if (env === 'production') {
      console.warn(`[DOTENV][${env}] Failed to load .env from ${envPath}:`, result.error);
    } else {
      console.warn(`[DOTENV][${env}] Could not load .env at ${envPath}:`, result.error);
    }
  }
}

