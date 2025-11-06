import express from 'express';
import { BookStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Get current user profile
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      points: true,
    },
  });

  res.json(user);
}));

// Get user statistics
router.get('/:id/stats', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [books, points, totalWords, avgLexile] = await Promise.all([
    prisma.book.count({
      where: { userId: id, status: BookStatus.APPROVED },
    }),
    prisma.point.findUnique({
      where: { userId: id },
    }),
    prisma.book.aggregate({
      where: { userId: id, status: BookStatus.APPROVED },
      _sum: { wordCount: true },
    }),
    prisma.book.aggregate({
      where: { userId: id, status: BookStatus.APPROVED, lexileLevel: { not: null } },
      _avg: { lexileLevel: true },
    }),
  ]);

  res.json({
    totalBooks: books,
    totalPoints: points?.totalPoints || 0,
    totalWords: totalWords._sum.wordCount || 0,
    avgLexile: Math.round(avgLexile._avg.lexileLevel || 0),
  });
}));

export default router;

