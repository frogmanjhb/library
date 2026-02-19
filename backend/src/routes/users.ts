import express from 'express';
import { BookStatus } from '../types/database';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  getUserById,
  getPointByUserId,
  countBooks,
  aggregateBooks,
} from '../lib/db-helpers';

const router = express.Router();

// Get current user profile
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await getUserById(req.user!.id);
  const points = await getPointByUserId(req.user!.id);
  
  res.json({ ...user, points });
}));

// Get user statistics
router.get('/:id/stats', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [books, points, totalWords, avgLexile] = await Promise.all([
    countBooks({ userId: id, status: BookStatus.APPROVED }),
    getPointByUserId(id),
    aggregateBooks(
      { userId: id, status: BookStatus.APPROVED },
      { _sum: { wordCount: true } }
    ),
    aggregateBooks(
      { userId: id, status: BookStatus.APPROVED, lexileLevel: { not: null } },
      { _avg: { lexileLevel: true } }
    ),
  ]);

  res.json({
    totalBooks: books,
    totalPoints: points?.totalPoints || 0,
    totalWords: totalWords._sum?.wordCount || 0,
    avgLexile: Math.round(avgLexile._avg?.lexileLevel || 0),
  });
}));

export default router;

