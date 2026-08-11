import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const getTodayChallenge = async (req: Request, res: Response) => {
  try {
    // For now, just return the first beginner preset challenge as "today's challenge"
    const challenge = await prisma.challenge.findFirst({
      where: {
        difficulty: 'beginner',
        type: 'preset',
      },
    });

    if (!challenge) {
      res.status(404).json({ success: false, message: 'No challenge found for today' });
      return;
    }

    res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

import { generateAdaptiveChallenge } from '../services/challenge-engine/adaptive-engine.js';
import { Difficulty } from '../services/challenge-engine/randomizer.js';

export const generateNewChallenge = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const difficulty = (req.body.difficulty || 'intermediate') as Difficulty;
    const timeLimit = req.body.timeLimit || 15;
    const wordTarget = req.body.wordTarget || 500;
    
    // CP17: The learning loop triggers here
    const challenge = await generateAdaptiveChallenge(userId, difficulty, timeLimit, wordTarget);

    // Save to DB immediately to mark it as "seen" and guarantee uniqueness
    const savedChallenge = await prisma.challenge.create({
      data: {
        userId,
        type: 'generated',
        mode: challenge.mode || 'normal',
        fingerprint: challenge.fingerprint,
        prompt: challenge.prompt,
        genre: challenge.genre,
        character: challenge.character,
        location: challenge.setting,
        situation: challenge.situation,
        object: challenge.object,
        constraint: challenge.constraint,
        difficulty: challenge.difficulty,
        targetSkill: challenge.targetSkill
      }
    });

    res.json({
      success: true,
      data: {
        ...challenge,
        id: savedChallenge.id
      }
    });

  } catch (error) {
    console.error('Error generating challenge:', error);
    res.status(500).json({ success: false, message: 'Failed to generate challenge' });
  }
};
