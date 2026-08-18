import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';

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

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = avatar.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save to public/avatars folder
    const fileName = `${userId}_${Date.now()}.jpg`;
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
    const filePath = path.join(avatarsDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    const avatarUrl = `/public/avatars/${fileName}`;

    // Update user in DB
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    res.json({
      success: true,
      data: { avatarUrl }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
