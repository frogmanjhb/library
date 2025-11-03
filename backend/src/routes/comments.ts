import express from 'express';
import { requireAuth, requireTeacher } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Get comments for a book
router.get('/:bookId', requireAuth, asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  const comments = await prisma.comment.findMany({
    where: { bookId },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(comments);
}));

// Add a comment to a book
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { bookId, content } = req.body;

  if (!bookId || !content) {
    throw new AppError('Book ID and content are required', 400);
  }

  // Check if book exists
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw new AppError('Book not found', 404);
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      bookId,
      teacherId: user.id,
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(201).json(comment);
}));

// Add a reaction (👍) to a comment
router.put('/:id/react', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: {
      reactions: { increment: 1 },
    },
  });

  res.json(updated);
}));

// Delete a comment
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // Only the comment author or librarian can delete
  if (comment.teacherId !== user.id && user.role !== 'LIBRARIAN') {
    throw new AppError('Access denied', 403);
  }

  await prisma.comment.delete({ where: { id } });

  res.json({ message: 'Comment deleted successfully' });
}));

export default router;

