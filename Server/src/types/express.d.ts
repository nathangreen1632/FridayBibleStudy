import 'express-serve-static-core';
import type { UserJwtPayload } from './auth.types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserJwtPayload;
  }
}
