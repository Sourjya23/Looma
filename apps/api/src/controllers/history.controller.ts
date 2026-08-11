import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const getWritingHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const sessions = await prisma.writingSession.findMany({
      where: {
        userId,
        status: 'submitted'
      },
      orderBy: {
        completedAt: 'desc'
      },
      skip,
      take: limit,
      include: {
        challenge: true,
        submissions: {
          orderBy: {
            submittedAt: 'desc'
          },
          take: 1,
          include: {
            englishAnalysis: { select: { score: true } },
            storyAnalysis: { select: { overallScore: true } },
            directorAnalysis: { select: { overallScore: true } }
          }
        }
      }
    });

    const total = await prisma.writingSession.count({
      where: { userId, status: 'submitted' }
    });

    res.json({
      success: true,
      data: sessions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
