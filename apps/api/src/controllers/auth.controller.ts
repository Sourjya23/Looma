import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { LoginRequest, RegisterRequest, AuthResponse, ApiError } from 'shared-types';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body as RegisterRequest;

    // Validate input (Basic for now)
    if (!email || !username || !password) {
      const errorResponse: ApiError = { success: false, message: 'All fields are required' };
      res.status(400).json(errorResponse);
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      const errorResponse: ApiError = { success: false, message: 'User already exists' };
      res.status(409).json(errorResponse);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = generateToken(user.id);

    const response: { success: boolean; data: AuthResponse } = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt.toISOString(),
          xp: user.xp,
          level: user.level,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastActiveDate: user.lastActiveDate?.toISOString() || null,
          displayName: user.displayName,
          leaderboardOptIn: user.leaderboardOptIn,
          avatarUrl: user.avatarUrl
        },
        token,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      const errorResponse: ApiError = { success: false, message: 'Email and password are required' };
      res.status(400).json(errorResponse);
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: email }
        ]
      },
    });

    if (!user) {
      const errorResponse: ApiError = { success: false, message: 'Invalid credentials' };
      res.status(401).json(errorResponse);
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const errorResponse: ApiError = { success: false, message: 'Invalid credentials' };
      res.status(401).json(errorResponse);
      return;
    }

    const token = generateToken(user.id);

    const response: { success: boolean; data: AuthResponse } = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt.toISOString(),
          xp: user.xp,
          level: user.level,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastActiveDate: user.lastActiveDate?.toISOString() || null,
          displayName: user.displayName,
          leaderboardOptIn: user.leaderboardOptIn,
          avatarUrl: user.avatarUrl
        },
        token,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastActiveDate: user.lastActiveDate?.toISOString() || null,
        displayName: user.displayName,
        leaderboardOptIn: user.leaderboardOptIn,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
