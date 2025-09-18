import { Router } from 'express';
import { submitContact } from '../controllers/contact.controller.js';
import { recaptchaGuard } from '../middleware/recaptcha.middleware.js';

const router: Router = Router();

router.post('/submit', recaptchaGuard('contact_submit'), submitContact);

export default router;
