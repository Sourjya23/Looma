import { Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboard.service.js';

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const period = req.query.period === 'alltime' ? 'alltime' : 'weekly';
    const limit = parseInt(req.query.limit as string) || 100;

    const leaderboard = await LeaderboardService.getLeaderboard(period, limit);
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMyRank = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const period = req.query.period === 'alltime' ? 'alltime' : 'weekly';

    const rankData = await LeaderboardService.getMyRank(userId, period);

    res.json({
      success: true,
      data: rankData
    });
  } catch (error) {
    console.error('Error fetching rank:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateOptIn = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { displayName, leaderboardOptIn } = req.body;
    
    const { prisma } = await import('../config/database.js');
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName,
        leaderboardOptIn: leaderboardOptIn
      }
    });

    if (leaderboardOptIn) {
      LeaderboardService.addXP(userId, updated.displayName || 'Anonymous', 0);
    } else {
      LeaderboardService.removeUser(userId);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const rebuildLeaderboard = async (_req: Request, res: Response) => {
  try {
    const count = await LeaderboardService.rebuildAllTimeLeaderboard();
    res.json({ success: true, message: `Rebuilt leaderboard for ${count} users` });
  } catch (err) {
    console.error('Error rebuilding leaderboard:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
