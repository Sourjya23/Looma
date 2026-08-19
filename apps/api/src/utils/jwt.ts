import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';

export const generateToken = (userId: string, rememberMe: boolean = false): string => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: rememberMe ? '5d' : '24h',
  });
};

export const verifyToken = (token: string): { userId: string } => {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
};
