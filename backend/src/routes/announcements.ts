import express from 'express';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  findAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../lib/db-helpers';

const router = express.Router();

// Get recent announcements
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const announcements = await findAnnouncements(10);
  res.json(announcements);
}));

// Create announcement (librarian only)
router.post('/', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { message } = req.body;

  if (!message) {
    throw new AppError('Message is required', 400);
  }

  const announcement = await createAnnouncement({
    message,
    createdBy: user.id,
  });

  // Emit socket event
  const io = req.app.get('io');
  io.emit('announcement:new', announcement);

  res.status(201).json(announcement);
}));

// Update announcement (librarian only)
router.put('/:id', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    throw new AppError('Message is required', 400);
  }

  const announcement = await updateAnnouncement(id, { message });

  res.json(announcement);
}));

// Delete announcement (librarian only)
router.delete('/:id', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { id } = req.params;

  await deleteAnnouncement(id);

  res.json({ message: 'Announcement deleted successfully' });
}));

export default router;

