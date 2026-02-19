import express from 'express';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { getPointByUserId, updatePoint } from '../lib/db-helpers';

const router = express.Router();

// Get points for a user
router.get('/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const points = await getPointByUserId(userId);

  if (!points) {
    throw new AppError('Points not found', 404);
  }

  res.json(points);
}));

// Manually adjust points (librarian only)
router.post('/adjust', requireLibrarian, asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || amount === undefined) {
    throw new AppError('User ID and amount are required', 400);
  }

  const points = await updatePoint(userId, { increment: parseInt(amount) });

  // Emit socket event
  const io = req.app.get('io');
  io.emit('leaderboard:update');

  res.json(points);
}));

export default router;

