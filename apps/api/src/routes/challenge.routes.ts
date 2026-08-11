import { Router } from 'express';
import { getTodayChallenge, generateNewChallenge } from '../controllers/challenge.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/today', requireAuth, getTodayChallenge);
router.post('/generate', requireAuth, generateNewChallenge);

export default router;
