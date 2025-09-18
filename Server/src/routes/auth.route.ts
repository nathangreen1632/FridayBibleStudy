import { Router } from 'express';
import {
  login,
  logout,
  me,
  register,
  requestReset,
  resetPassword,
  updateProfile,
} from '../controllers/auth.controller.js';
import { recaptchaMiddleware } from '../middleware/recaptcha.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

router.post('/register', recaptchaMiddleware, register);
router.post('/login', recaptchaMiddleware, login);

router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

router.post('/request-reset', recaptchaMiddleware, requestReset);
router.post('/reset-password', recaptchaMiddleware, resetPassword);

router.put('/profile', requireAuth, updateProfile);

export default router;
