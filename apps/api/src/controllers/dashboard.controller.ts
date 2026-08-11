import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const range = (req.query.range as string) || '30d';

    const data = await AnalyticsService.getDashboardOverview(userId, range);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
