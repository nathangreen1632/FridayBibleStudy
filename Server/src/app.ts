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
import { getUploadRoot, ensureDirSafe } from './config/paths.js';

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
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use('/api', apiRouter);

  const UPLOAD_ROOT = getUploadRoot();
  void ensureDirSafe(UPLOAD_ROOT);

  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      index: false,
      fallthrough: true,
      maxAge: '1y',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );

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
      index: false,
      maxAge: '1h',
      fallthrough: true,
    })
  );

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

  app.use(errorHandler);

  return app;
}

export function attachSockets(server: HttpServer): void {
  initSocket(server);
}
