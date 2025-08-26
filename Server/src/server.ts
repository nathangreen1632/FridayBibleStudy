import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { initDb } from './utils/bootstrap.js';

const app = createApp();
const server = http.createServer(app);

// Prefer PORT from env, but fall back to 3001 for local dev
const PORT = Number(env.PORT ?? 3001);
const URL = `http://localhost:${PORT}`;

(async () => {
  try {
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
