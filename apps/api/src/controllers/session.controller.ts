import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { GamificationService } from '../services/gamification.service.js';

export const createSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { challengeId, challengePayload, targetTime, wordTarget, difficulty } = req.body;

    if ((!challengeId && !challengePayload) || targetTime === undefined || wordTarget === undefined || !difficulty) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    let finalChallengeId = challengeId;

    if (challengePayload && !challengeId) {
      // Persist the generated challenge
      const newChallenge = await prisma.challenge.create({
        data: {
          userId,
          type: 'generated',
          mode: challengePayload.mode || 'normal',
          fingerprint: challengePayload.fingerprint,
          prompt: challengePayload.prompt,
          genre: challengePayload.genre,
          character: challengePayload.character,
          location: challengePayload.setting,
          situation: challengePayload.situation,
          object: challengePayload.object,
          constraint: challengePayload.constraint,
          difficulty: challengePayload.difficulty,
          timeLimit: targetTime,
          wordTarget: wordTarget,
        }
      });
      finalChallengeId = newChallenge.id;
    }

    const session = await prisma.writingSession.create({
      data: {
        userId,
        challengeId: finalChallengeId,
        targetTime,
        wordTarget,
        difficulty,
        status: 'idle',
      },
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;

    const session = await prisma.writingSession.findUnique({
      where: { id: sessionId },
      include: { 
        challenge: true,
        submissions: {
          orderBy: { version: 'asc' }
        }
      },
    });

    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSubmission = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const submissionId = req.params.id as string;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        session: true,
        englishAnalysis: true,
        storyAnalysis: true,
        directorAnalysis: true
      }
    });

    if (!submission || submission.session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const submitSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;
    const { content, wordCount, characterCount, timeSpent, title } = req.body;

    const session = await prisma.writingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.status === 'submitted') {
      res.status(400).json({ success: false, message: 'Session already submitted' });
      return;
    }

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.submission.create({
        data: {
          sessionId,
          title,
          content,
          wordCount,
          characterCount,
        }
      });

      return tx.writingSession.update({
        where: { id: sessionId },
        data: {
          status: 'submitted',
          completedAt: new Date(),
          activeTime: timeSpent,
          title
        },
        include: {
          challenge: true,
          submissions: true
        }
      });
    });

    const isTargeted = result.challenge?.type === 'targeted';
    const xpAmount = isTargeted ? 25 : 20;
    
    // We need the submission ID. The tx returns the updated session. 
    // Wait, the tx above doesn't return the submission ID, it returns the session. 
    // Let's get the submission ID from the session we just returned:
    const newSubmission = result.submissions?.[result.submissions.length - 1];
    if (newSubmission) {
      await GamificationService.awardXP(userId, xpAmount, 'completed_writing', newSubmission.id);
      
      // Trigger AI Analysis Pipeline
      const { aiQueue } = await import('../services/queue.service.js');
      await aiQueue.add('english-analysis', {
        submissionId: newSubmission.id,
        content,
        challengePrompt: result.challenge?.prompt || '',
        role: 'english'
      });
      await aiQueue.add('story-analysis', {
        submissionId: newSubmission.id,
        content,
        challengePrompt: result.challenge?.prompt || '',
        role: 'story'
      });
      await aiQueue.add('director-analysis', {
        submissionId: newSubmission.id,
        content,
        challengePrompt: result.challenge?.prompt || '',
        role: 'director'
      });
    }
    await GamificationService.evaluateStreak(userId);
    // Background check achievements
    GamificationService.checkAchievements(userId).catch(console.error);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const autosaveSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;
    const { content, title } = req.body;

    const session = await prisma.writingSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.status === 'submitted') {
      res.status(400).json({ success: false, message: 'Cannot autosave submitted session' });
      return;
    }

    await prisma.writingSession.update({
      where: { id: sessionId },
      data: { draftContent: content, title: title }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error autosaving session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const startSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;

    const session = await prisma.writingSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.status !== 'idle') {
      res.json({ success: true, data: session, message: 'Session already started' });
      return;
    }

    const updated = await prisma.writingSession.update({
      where: { id: sessionId },
      data: { 
        status: 'running',
        startedAt: new Date()
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const pauseSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;

    const session = await prisma.writingSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.status !== 'running' && session.status !== 'overtime') {
      res.status(400).json({ success: false, message: 'Session is not running' });
      return;
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.pauseEvent.create({
        data: {
          sessionId
        }
      });
      return tx.writingSession.update({
        where: { id: sessionId },
        data: { status: 'paused' }
      });
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error pausing session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const resumeSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;

    const session = await prisma.writingSession.findUnique({ 
      where: { id: sessionId },
      include: { pauseEvents: { orderBy: { pausedAt: 'desc' }, take: 1 } }
    });
    
    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.status !== 'paused') {
      res.status(400).json({ success: false, message: 'Session is not paused' });
      return;
    }

    const lastPause = session.pauseEvents[0];
    
    const updated = await prisma.$transaction(async (tx: any) => {
      if (lastPause && !lastPause.resumedAt) {
        await tx.pauseEvent.update({
          where: { id: lastPause.id },
          data: { resumedAt: new Date() }
        });
      }
      return tx.writingSession.update({
        where: { id: sessionId },
        data: { status: 'running' } // Could also be overtime, but we let frontend calculate it based on time
      });
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const autosaveRevision = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;
    const { content } = req.body;

    const session = await prisma.writingSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    await prisma.writingSession.update({
      where: { id: sessionId },
      data: { draftRevisionContent: content }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error autosaving revision:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const submitRevision = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;
    const { content, wordCount, characterCount, activeWritingTime, parentSubmissionId } = req.body;

    const session = await prisma.writingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const parentSubmission = await prisma.submission.findUnique({
      where: { id: parentSubmissionId }
    });

    if (!parentSubmission) {
      res.status(404).json({ success: false, message: 'Parent submission not found' });
      return;
    }

    const newVersion = parentSubmission.version + 1;

    const newSubmission = await prisma.$transaction(async (tx: any) => {
      const created = await tx.submission.create({
        data: {
          sessionId,
          title: session.title,
          content,
          wordCount,
          characterCount,
          activeWritingTime,
          version: newVersion,
          parentSubmissionId,
        }
      });

      // Clear draft
      await tx.writingSession.update({
        where: { id: sessionId },
        data: { draftRevisionContent: null }
      });

      return created;
    });

    await GamificationService.awardXP(userId, 15, 'completed_revision', newSubmission.id);
    // Background check achievements
    GamificationService.checkAchievements(userId).catch(console.error);

    res.json({ success: true, data: { submission: newSubmission, xpAwarded: 15 } });
  } catch (error) {
    console.error('Error submitting revision:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;

    const session = await prisma.writingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.isBookmarked) {
      res.status(400).json({ success: false, message: 'Cannot delete a bookmarked story. Please unbookmark it first.' });
      return;
    }

    await prisma.writingSession.delete({
      where: { id: sessionId }
    });

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const toggleBookmark = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id as string;

    const session = await prisma.writingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const updated = await prisma.writingSession.update({
      where: { id: sessionId },
      data: { isBookmarked: !session.isBookmarked }
    });

    res.json({ success: true, data: { isBookmarked: updated.isBookmarked } });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
