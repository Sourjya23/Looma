import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getProfile, uploadAvatar } from '../controllers/profile.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.put('/avatar', uploadAvatar);

export default router;
