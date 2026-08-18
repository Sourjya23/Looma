import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await prisma.writingProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { avatar } = req.body;
    if (!avatar || typeof avatar !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid avatar data' });
      return;
    }

    // Save directly to DB as a base64 Data URI
    // The frontend compresses it to ~5KB so it's perfectly safe.
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatar }
    });

    res.json({
      success: true,
      data: { avatarUrl: avatar }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
