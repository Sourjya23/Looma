import { Router } from 'express';
import { getLeaderboard, getMyRank, updateOptIn, rebuildLeaderboard } from '../controllers/leaderboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getLeaderboard);
router.get('/me', requireAuth, getMyRank);
router.put('/opt-in', requireAuth, updateOptIn);
router.post('/rebuild', requireAuth, rebuildLeaderboard);

export default router;
