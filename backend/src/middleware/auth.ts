import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { Role, User as DatabaseUser } from '../types/database';
import { AppError } from './errorHandler';
import { getUserById } from '../lib/db-helpers';

// Ensure JWT_SECRET is available even if this module is imported before
// `server.ts` calls `dotenv.config()`.
//
// Note: `backend/.env` in this repo is sometimes saved as UTF-16LE on Windows,
// so we do our own read + encoding detection instead of relying on dotenv's
// default file reading.
const envPath = path.resolve(__dirname, '../../.env');
if (!process.env.JWT_SECRET && fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath);

  // Heuristic: UTF-16LE content will contain null bytes when interpreted as utf8.
  let utf8 = raw.toString('utf8');
  if (utf8.includes('\u0000')) {
    utf8 = raw.toString('utf16le');
  }

  const parsed = dotenv.parse(utf8);
  if (parsed.JWT_SECRET) {
    process.env.JWT_SECRET = parsed.JWT_SECRET;
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export const generateToken = (userId: string, email: string, role: Role): string => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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

    // Type assertion needed because Express.User might not have all properties
    const user = req.user as DatabaseUser;
    if (!roles.includes(user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Middleware to check if user is a student
export const requireStudent = requireRole(Role.STUDENT);

// Middleware to check if user is a teacher or librarian
export const requireTeacher = requireRole(Role.TEACHER, Role.LIBRARIAN);

// Middleware to check if user is a librarian
export const requireLibrarian = requireRole(Role.LIBRARIAN);

