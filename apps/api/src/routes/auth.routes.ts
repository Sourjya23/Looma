import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/index.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

export default router;
