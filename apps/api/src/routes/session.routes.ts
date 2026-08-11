import { Router } from 'express';
import { createSession, getSession, getSubmission, submitSession, autosaveSession, startSession, pauseSession, resumeSession, autosaveRevision, submitRevision, deleteSession, toggleBookmark } from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createSessionSchema, submitSessionSchema, autosaveSessionSchema } from '../schemas/index.js';

const router = Router();

router.post('/', requireAuth, validate(createSessionSchema), createSession);
router.get('/:id', requireAuth, getSession);
router.put('/:id/submit', requireAuth, validate(submitSessionSchema), submitSession);
router.put('/:id/autosave', requireAuth, validate(autosaveSessionSchema), autosaveSession);
router.put('/:id/autosave-revision', requireAuth, validate(autosaveSessionSchema), autosaveRevision);
router.put('/:id/submit-revision', requireAuth, validate(submitSessionSchema), submitRevision);
router.put('/:id/start', requireAuth, startSession);
router.put('/:id/pause', requireAuth, pauseSession);
router.put('/:id/resume', requireAuth, resumeSession);
router.put('/:id/bookmark', requireAuth, toggleBookmark);
router.delete('/:id', requireAuth, deleteSession);

router.get('/submissions/:id', requireAuth, getSubmission);

export default router;
