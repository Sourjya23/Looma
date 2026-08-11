import { Router } from 'express';
import { getProfile, getXpHistory } from '../controllers/gamification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/profile', requireAuth, getProfile);
router.get('/xp-history', requireAuth, getXpHistory);

export default router;
