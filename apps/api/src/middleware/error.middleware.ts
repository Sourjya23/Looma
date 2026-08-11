import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  errors?: Record<string, string[]>;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status === 500) {
    console.error('🔥 Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(err.errors && { errors: err.errors }),
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}

export function createAppError(status: number, message: string, errors?: Record<string, string[]>): AppError {
  const error = new Error(message) as AppError;
  error.status = status;
  if (errors) error.errors = errors;
  return error;
}
