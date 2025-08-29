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

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

export function createApp(): Express {
  const app: Express = express();

  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.use(cspMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "object-src": ["'none'"],
          "frame-ancestors": ["'self'"],
          "img-src": ["'self'", "data:"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "connect-src": ["'self'", "ws:", "wss:"],
          "frame-src": ["'self'"]
        }
      },
      crossOriginOpenerPolicy: { policy: 'same-origin' }
    })
  );

  app.use('/api', apiRouter);

  const clientDist = path.resolve(__dirname, '../../Client/dist');

  app.use(
    '/assets',
    express.static(path.join(clientDist, 'assets'), {
      immutable: true,
      maxAge: '1y',
      fallthrough: true,
    })
  );

  app.use(
    express.static(clientDist, {
      index: false,          // we'll handle SPA fallback below
      maxAge: '1h',
      fallthrough: true,
    })
  );

  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

export function attachSockets(server: HttpServer): void {
  initSocket(server);
}
