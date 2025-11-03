import express from 'express';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Get recent announcements
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json(announcements);
}));

// Create announcement (librarian only)
router.post('/', requireLibrarian, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { message } = req.body;

  if (!message) {
    throw new AppError('Message is required', 400);
  }

  const announcement = await prisma.announcement.create({
    data: {
      message,
      createdBy: user.id,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Emit socket event
  const io = req.app.get('io');
  io.emit('announcement:new', announcement);

  res.status(201).json(announcement);
}));

// Update announcement (librarian only)
router.put('/:id', requireLibrarian, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    throw new AppError('Message is required', 400);
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { message },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.json(announcement);
}));

// Delete announcement (librarian only)
router.delete('/:id', requireLibrarian, asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.announcement.delete({ where: { id } });

  res.json({ message: 'Announcement deleted successfully' });
}));

export default router;

