import { Router } from 'express';
import { getWritingHistory } from '../controllers/history.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getWritingHistory);

export default router;
