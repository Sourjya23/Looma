import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        achievements: user.achievements
      }
    });
  } catch (error) {
    console.error('Error fetching gamification profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getXpHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const events = await prisma.xPEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    
    const total = await prisma.xPEvent.count({ where: { userId } });

    res.json({
      success: true,
      data: events,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching XP history:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
