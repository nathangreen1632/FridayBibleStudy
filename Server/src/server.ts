import http from 'http';
import { createApp, attachSockets } from './app.js';
import { env } from './config/env.config.js';
import { initDb } from './utils/bootstrap.js';
import { ensureServiceAccountKeyFile } from './helpers/serviceAccountKey.helper.js';
import {Express} from "express";

const app: Express = createApp();
const server = http.createServer(app);

const PORT: number = Number(env.PORT ?? 3001);
const URL = `http://localhost:${PORT}`;

(async (): Promise<void> => {
  try {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = <string>await ensureServiceAccountKeyFile(
      env.SERVICE_ACCOUNT_KEY_PATH,
      env.GOOGLE_CREDENTIALS_B64
    );

    await initDb();
    attachSockets(server);

    server.listen(PORT, (): void => {
      console.log(`[server] backend ready → ${URL}`);
      console.log(`[server] health check → ${URL}/api/health`);
    });
  } catch (e) {
    console.error('[server] failed to init DB:', (e as Error).message);
    process.exit(1);
  }
})();
