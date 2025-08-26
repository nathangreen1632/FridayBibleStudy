import { Router } from 'express';
import {
  login,
  logout,
  me,
  register,
  requestReset,
  resetPassword
} from '../controllers/auth.controller.js';
import { recaptchaRequired } from '../middleware/recaptcha.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

router.post('/register', recaptchaRequired('signup'), register);
router.post('/login', recaptchaRequired('login'),  login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/request-reset', recaptchaRequired('request_reset'),  requestReset);
router.post('/reset-password', recaptchaRequired('reset_password'), resetPassword);

export default router;
