import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { AIService } from '../services/ai.service.js';
import { aiQueue } from '../services/queue.service.js';

export const getAnalysis = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const analysis = await prisma.englishAnalysis.findUnique({
      where: { submissionId: id }
    });
    
    if (!analysis) {
      return res.json(null);
    }
    
    res.json(analysis);
  } catch (error: any) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
};

export const analyzeSubmission = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // 1. Fetch submission and its challenge
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            challenge: true,
          }
        }
      }
    }) as any; // Quick cast since Prisma Client types seem to be lagging behind

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Minimum word gate
    const wordCount = submission.content.trim().split(/\s+/).length;
    if (wordCount < 50) {
      return res.status(400).json({ 
        error: `Your story is only ${wordCount} words. Write at least 50 words to get meaningful feedback.` 
      });
    }

    // 2. Add job to queue instead of waiting synchronously
    await aiQueue.add('english-analysis', {
      submissionId: submission.id,
      content: submission.content,
      challengePrompt: submission.session.challenge.prompt,
      role: 'english'
    });

    res.json({ queued: true, message: 'Analysis is being processed' });
  } catch (error: any) {
    console.error('Analyze submission error:', error);
    res.status(500).json({ error: 'Failed to analyze submission', details: error.message });
  }
};

export const getStoryAnalysis = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const analysis = await prisma.storyAnalysis.findUnique({
      where: { submissionId: id }
    });
    
    if (!analysis) {
      return res.json(null);
    }
    
    res.json(analysis);
  } catch (error: any) {
    console.error('Get story analysis error:', error);
    res.status(500).json({ error: 'Failed to get story analysis' });
  }
};

export const analyzeStorySubmission = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            challenge: true,
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Minimum word gate — don't waste AI on <50 word submissions
    const wordCount = submission.content.trim().split(/\s+/).length;
    if (wordCount < 50) {
      return res.status(400).json({ 
        error: `Your story is only ${wordCount} words. Write at least 50 words to get meaningful story feedback.` 
      });
    }

    // 2. Add job to queue
    await aiQueue.add('story-analysis', {
      submissionId: submission.id,
      content: submission.content,
      challengePrompt: submission.session.challenge.prompt,
      role: 'story'
    });

    res.json({ queued: true, message: 'Analysis is being processed' });
  } catch (error: any) {
    console.error('Analyze story submission error:', error);
    res.status(500).json({ error: 'Failed to analyze story submission', details: error.message });
  }
};

export const getDirectorAnalysis = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const analysis = await prisma.directorAnalysis.findUnique({
      where: { submissionId: id }
    });
    
    if (!analysis) {
      return res.json(null);
    }
    
    res.json(analysis);
  } catch (error: any) {
    console.error('Get director analysis error:', error);
    res.status(500).json({ error: 'Failed to get director analysis' });
  }
};

export const analyzeDirectorSubmission = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            challenge: true,
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Minimum word gate
    const dirWordCount = submission.content.trim().split(/\s+/).length;
    if (dirWordCount < 50) {
      return res.status(400).json({ 
        error: `Your story is only ${dirWordCount} words. Write at least 50 words to get director feedback.` 
      });
    }

    // 2. Add job to queue
    await aiQueue.add('director-analysis', {
      submissionId: submission.id,
      content: submission.content,
      challengePrompt: submission.session.challenge.prompt,
      role: 'director'
    });

    res.json({ queued: true, message: 'Analysis is being processed' });
  } catch (error: any) {
    console.error('Analyze director submission error:', error);
    res.status(500).json({ error: 'Failed to analyze director submission', details: error.message });
  }
};

export const getAnalysisStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // We check if the analysis records exist
    const [english, story, director] = await Promise.all([
      prisma.englishAnalysis.findUnique({ where: { submissionId: id }, select: { id: true } }),
      prisma.storyAnalysis.findUnique({ where: { submissionId: id }, select: { id: true } }),
      prisma.directorAnalysis.findUnique({ where: { submissionId: id }, select: { id: true } })
    ]);
    
    res.json({
      success: true,
      data: {
        english: !!english,
        story: !!story,
        director: !!director
      }
    });
  } catch (err: any) {
    console.error('Failed to get analysis status', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const analyzeAllSubmissions = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            challenge: true,
          }
        }
      }
    }) as any;

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const wordCount = submission.content.trim().split(/\s+/).length;
    if (wordCount < 50) {
      return res.status(400).json({ 
        error: `Your story is only ${wordCount} words. Write at least 50 words to get meaningful feedback.` 
      });
    }

    // Queue all three analyses
    await Promise.all([
      aiQueue.add('english-analysis', {
        submissionId: submission.id,
        content: submission.content,
        challengePrompt: submission.session.challenge.prompt,
        role: 'english'
      }),
      aiQueue.add('story-analysis', {
        submissionId: submission.id,
        content: submission.content,
        challengePrompt: submission.session.challenge.prompt,
        role: 'story'
      }),
      aiQueue.add('director-analysis', {
        submissionId: submission.id,
        content: submission.content,
        challengePrompt: submission.session.challenge.prompt,
        role: 'director'
      })
    ]);

    res.json({ queued: true, message: 'All analyses are being processed in parallel' });
  } catch (error: any) {
    console.error('Analyze all error:', error);
    res.status(500).json({ error: 'Failed to analyze submission', details: error.message });
  }
};
