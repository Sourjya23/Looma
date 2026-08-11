import { Router } from 'express';
import { analyzeSubmission, getAnalysis, getStoryAnalysis, analyzeStorySubmission, getDirectorAnalysis, analyzeDirectorSubmission, getAnalysisStatus, analyzeAllSubmissions } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// English Teacher Routes
router.get('/submissions/:id/analysis', requireAuth, getAnalysis);
router.post('/submissions/:id/analyze', requireAuth, analyzeSubmission);

// Story Editor Routes
router.get('/submissions/:id/story-analysis', requireAuth, getStoryAnalysis);
router.post('/submissions/:id/analyze-story', requireAuth, analyzeStorySubmission);

// Director AI Routes
router.get('/submissions/:id/director-analysis', requireAuth, getDirectorAnalysis);
router.post('/submissions/:id/analyze-director', requireAuth, analyzeDirectorSubmission);

// Status Polling Route
router.get('/submissions/:id/analysis-status', requireAuth, getAnalysisStatus);
router.post('/submissions/:id/analyze-all', requireAuth, analyzeAllSubmissions);

export default router;
