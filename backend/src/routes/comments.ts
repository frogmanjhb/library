import express from 'express';
import { requireAuth, requireTeacher } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  findCommentsByBookId,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
  getBookById,
} from '../lib/db-helpers';

const router = express.Router();

// Get comments for a book
router.get('/:bookId', requireAuth, asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  const comments = await findCommentsByBookId(bookId);
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
  const book = await getBookById(bookId);
  if (!book) {
    throw new AppError('Book not found', 404);
  }

  const comment = await createComment({
    content,
    bookId,
    teacherId: user.id,
  });

  res.status(201).json(comment);
}));

// Add a reaction (👍) to a comment
router.put('/:id/react', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await getCommentById(id);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  const updated = await updateComment(id, { reactions: 1 });

  res.json(updated);
}));

// Delete a comment
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const comment = await getCommentById(id);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // Only the comment author or librarian can delete
  if (comment.teacherId !== user.id && user.role !== 'LIBRARIAN') {
    throw new AppError('Access denied', 403);
  }

  await deleteComment(id);

  res.json({ message: 'Comment deleted successfully' });
}));

export default router;

