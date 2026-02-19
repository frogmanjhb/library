import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../types/database';
import { AppError } from './errorHandler';
import { getUserById } from '../lib/db-helpers';

interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export const generateToken = (userId: string, email: string, role: Role): string => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};

// Middleware to check if user is authenticated
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for session-based auth first (from Passport)
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }

    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authorization token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Fetch user from database
    const user = await getUserById(decoded.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check specific roles
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Middleware to check if user is a student
export const requireStudent = requireRole('STUDENT');

// Middleware to check if user is a teacher or librarian
export const requireTeacher = requireRole('TEACHER', 'LIBRARIAN');

// Middleware to check if user is a librarian
export const requireLibrarian = requireRole('LIBRARIAN');

