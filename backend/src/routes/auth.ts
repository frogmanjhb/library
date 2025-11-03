import express from 'express';
import { generateToken, requireAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Simple dev login - just provide email
router.post('/login', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // Find user by email
  let user = await prisma.user.findUnique({
    where: { email },
  });

  // If user doesn't exist and it's a stpeters.co.za email, create them
  if (!user && email.endsWith('@stpeters.co.za')) {
    user = await prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
        role: 'STUDENT', // Default role
      },
    });

    // Create initial points entry
    await prisma.point.create({
      data: {
        userId: user.id,
        totalPoints: 0,
      },
    });
  }

  if (!user) {
    throw new AppError('User not found. Please use a @stpeters.co.za email.', 404);
  }

  // Generate JWT token
  const token = generateToken(user.id, user.email, user.role);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      grade: user.grade,
      class: user.class,
    },
  });
}));

// Get current user
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    id: user!.id,
    email: user!.email,
    name: user!.name,
    role: user!.role,
    grade: user!.grade,
    class: user!.class,
  });
}));

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;

