// Server/src/app.ts
import express, { Express } from 'express';
import type { Server as HttpServer } from 'http';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { cspMiddleware } from './middleware/csp.middleware.js';
import { initSocket } from './config/socket.config.js';
// ⬇️ use Render-safe upload path helpers
import { getUploadRoot, ensureDirSafe } from './config/paths.js';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

export function createApp(): Express {
  const app: Express = express();

  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // Your custom CSP first (keeps control in one place)
  app.use(cspMiddleware);

  app.use(
    helmet({
      // We already set CSP via cspMiddleware.
      contentSecurityPolicy: false,
      // COEP off because we serve our own static assets
      crossOriginEmbedderPolicy: false,
    })
  );

  // ---- API (JSON) ----
  app.use('/api', apiRouter);

  // ---- Static: uploads (user content) ----
  // Use a subdirectory on the mounted disk (e.g., /var/data/fbs-uploads on Render)
  const UPLOAD_ROOT = getUploadRoot();
  // fire-and-forget; do not change createApp() to async
  void ensureDirSafe(UPLOAD_ROOT);

  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      index: false,
      fallthrough: true,
      // user content can be relatively cacheable; tune as you like
      maxAge: '1y',
      setHeaders: (res) => {
        // immutable helps hashed filenames; harmless for user content too
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );

  // ---- Static: built client (Vite) ----
  const clientDist = path.resolve(__dirname, '../../Client/dist');

  // hashed assets (immutable)
  app.use(
    '/assets',
    express.static(path.join(clientDist, 'assets'), {
      immutable: true,
      maxAge: '1y',
      fallthrough: true,
    })
  );

  // other static files from dist (e.g., index.html is served by the SPA fallback below)
  app.use(
    express.static(clientDist, {
      index: false, // SPA fallback handles routes
      maxAge: '1h',
      fallthrough: true,
    })
  );

  // ---- SPA fallback ----
  // Only for non-API, non-static requests; send index.html so client router can handle it
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/assets') ||
      req.path.startsWith('/uploads')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // ---- Error handler ----
  app.use(errorHandler);

  return app;
}

export function attachSockets(server: HttpServer): void {
  initSocket(server);
}
