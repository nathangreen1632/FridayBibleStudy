// Server/src/server.ts
import http from 'http';
import {createApp} from './app.js';
import {env} from './config/env.config.js';
import {initDb} from './utils/bootstrap.js';
import {ensureServiceAccountKeyFile} from './helpers/serviceAccountKey.helper.js';

const app = createApp();
const server = http.createServer(app);

// Prefer PORT from env, but fall back to 3001 for local dev
const PORT = Number(env.PORT ?? 3001);
const URL = `http://localhost:${PORT}`;

(async () => {
  try {
    // Materialize key securely for dev if provided via B64
    process.env.GOOGLE_APPLICATION_CREDENTIALS = <string>await ensureServiceAccountKeyFile(
      env.SERVICE_ACCOUNT_KEY_PATH,
      env.GOOGLE_CREDENTIALS_B64
    );

    await initDb(); // create DB (dev), authenticate, sync models, seed Group
    server.listen(PORT, () => {
      console.log(`[server] backend ready → ${URL}`);
      console.log(`[server] health check → ${URL}/api/health`);
    });
  } catch (e) {
    console.error('[server] failed to init DB:', (e as Error).message);
    process.exit(1);
  }
})();
