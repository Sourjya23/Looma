import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
