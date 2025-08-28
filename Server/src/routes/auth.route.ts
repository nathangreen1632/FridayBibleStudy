import { Router } from 'express';
import {
  login,
  logout,
  me,
  register,
  requestReset,
  resetPassword,
} from '../controllers/auth.controller.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Account creation & login (path-mapped reCAPTCHA)
router.post('/register', recaptchaMiddleware, register);
router.post('/login', recaptchaMiddleware, login);

// Session
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

// Password reset flow (path-mapped reCAPTCHA)
router.post('/request-reset', recaptchaMiddleware, requestReset);
router.post('/reset-password', recaptchaMiddleware, resetPassword);

export default router;
