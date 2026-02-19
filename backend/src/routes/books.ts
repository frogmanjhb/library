import express from 'express';
import { BookStatus } from '../types/database';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  findUsers,
  findBooksWithRelations,
  getBookWithRelations,
  createBook,
  updateBook,
  updateBooks,
  deleteBook,
  deleteBooks,
  getBookById,
  getUserById,
  upsertPoint,
  updatePoints,
} from '../lib/db-helpers';
import { searchBookInfo } from '../services/bookSearch';
import { getStudentCurrentLexile } from './lexile';

const router = express.Router();

// Get books with filtering based on role
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { userId, grade, class: className, sortBy = 'createdAt', order = 'desc', status } = req.query;

  let where: any = {};
  const statusParam = Array.isArray(status) ? status[0] : status;

  if (statusParam) {
    const normalizedStatus = statusParam.toUpperCase();
    if (!Object.values(BookStatus).includes(normalizedStatus as BookStatus)) {
      throw new AppError('Invalid status filter', 400);
    }
    where.status = normalizedStatus as BookStatus;
  }

  // Build where clause for books
  let bookWhere: { userId?: string | string[]; status?: BookStatus } = {};

  // Apply role-based filtering
  if (user.role === 'STUDENT') {
    bookWhere.userId = user.id;
  } else if (user.role === 'TEACHER') {
    // Teachers see books from their grade/class
    const students = await findUsers({
      role: 'STUDENT',
      grade: user.grade || undefined,
      class: user.class || undefined,
    });
    bookWhere.userId = students.map(s => s.id);
    if (!statusParam) {
      bookWhere.status = BookStatus.APPROVED;
    }
  } else if (!statusParam && user.role !== 'LIBRARIAN') {
    // Default to approved for non-student, non-librarian roles
    bookWhere.status = BookStatus.APPROVED;
  }
  // Librarians see all books unless a status filter is supplied

  // Apply additional filters
  if (userId) {
    bookWhere.userId = userId as string;
  }
  if (grade) {
    const students = await findUsers({
      role: 'STUDENT',
      grade: parseInt(grade as string),
    });
    bookWhere.userId = students.map(s => s.id);
  }
  if (className) {
    const students = await findUsers({
      role: 'STUDENT',
      class: className as string,
    });
    bookWhere.userId = students.map(s => s.id);
  }

  if (statusParam) {
    bookWhere.status = statusParam as BookStatus;
  }

  const books = await findBooksWithRelations(
    bookWhere,
    { field: sortBy as string, order: order as 'asc' | 'desc' }
  );

  res.json(books);
}));

// Get single book
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const book = await getBookWithRelations(id);

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  // Check permissions
  if (user.role === 'STUDENT' && book.userId !== user.id) {
    throw new AppError('Access denied', 403);
  }

  res.json(book);
}));

// Create a new book log (students) or on behalf of student (librarians)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { title, author, rating, comment, lexileLevel, wordCount, ageRange, genres, coverUrl, userId: targetUserId } = req.body;

  // Validate required fields
  if (!title || !author || !rating) {
    throw new AppError('Title, author, and rating are required', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  let bookUserId: string;
  if (user.role === 'LIBRARIAN' && targetUserId) {
    const target = await getUserById(targetUserId);
    if (!target || target.role !== 'STUDENT') {
      throw new AppError('Invalid or non-student userId', 400);
    }
    bookUserId = targetUserId;
  } else if (user.role === 'STUDENT') {
    bookUserId = user.id;
  } else {
    throw new AppError('Only students can log books, or librarians must provide userId', 403);
  }

  // Create book immediately with user-provided data
  const book = await createBook({
    title,
    author,
    rating,
    comment,
    lexileLevel: lexileLevel ? parseInt(lexileLevel) : null,
    wordCount: wordCount ? parseInt(wordCount) : null,
    ageRange,
    genres: genres || [],
    coverUrl,
    userId: bookUserId,
    status: BookStatus.PENDING,
  });

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('book:logged', { bookId: book.id, userId: bookUserId });
  io.emit('leaderboard:update');

  // Trigger asynchronous background search for word count and genre
  // Don't await - let it run in the background
  searchAndUpdateBook(book.id, title, author).catch((error) => {
    console.error(`Failed to update book ${book.id} with search results:`, error);
  });

  res.status(201).json(book);
}));

// Bulk delete books (librarian only)
router.delete('/bulk', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array is required and must not be empty', 400);
  }

  const books = await findBooks({ id: ids });

  for (const book of books) {
    await deleteBook(book.id);
    if (book.pointsAwarded && book.pointsAwardedValue && book.pointsAwardedValue > 0) {
      await updatePoints(book.userId, { decrement: book.pointsAwardedValue });
    }
  }

  const io = req.app.get('io');
  io.emit('leaderboard:update');

  res.json({ deleted: books.length });
}));

// Bulk update books (librarian only) - e.g. status, lexileLevel, wordCount
router.patch('/bulk', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { ids, ...fields } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array is required and must not be empty', 400);
  }

  const allowedFields = ['status', 'lexileLevel', 'wordCount', 'ageRange', 'genres'];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      if (key === 'lexileLevel' || key === 'wordCount') {
        updateData[key] = fields[key] === null || fields[key] === '' ? null : parseInt(fields[key], 10);
      } else if (key === 'status') {
        const s = String(fields[key]).toUpperCase();
        if (['PENDING', 'APPROVED', 'REJECTED'].includes(s)) {
          updateData[key] = s;
        }
      } else {
        updateData[key] = fields[key];
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('Provide at least one field to update (status, lexileLevel, wordCount, ageRange, genres)', 400);
  }

  const count = await updateBooks(ids, updateData);

  const io = req.app.get('io');
  io.emit('leaderboard:update');

  res.json({ updated: count });
}));

// Update book
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const book = await getBookById(id);

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  // Only the book owner or a librarian can update
  if (book.userId !== user.id && user.role !== 'LIBRARIAN') {
    throw new AppError('Access denied', 403);
  }

  const { title, author, rating, comment, lexileLevel, wordCount, ageRange, genres, coverUrl } = req.body;

  const hasLexile = lexileLevel !== undefined;
  const parsedLexile = (() => {
    if (!hasLexile) return book.lexileLevel;
    if (lexileLevel === null || lexileLevel === '') return null;
    const numeric = Number(lexileLevel);
    return Number.isFinite(numeric) ? numeric : book.lexileLevel;
  })();

  const hasWordCount = wordCount !== undefined;
  const parsedWordCount = (() => {
    if (!hasWordCount) return book.wordCount;
    if (wordCount === null || wordCount === '') return null;
    const numeric = Number(wordCount);
    return Number.isFinite(numeric) ? numeric : book.wordCount;
  })();

  const updatedBook = await updateBook(id, {
    title: title ?? book.title,
    author: author ?? book.author,
    rating: rating ?? book.rating,
    comment: comment ?? book.comment,
    lexileLevel: parsedLexile,
    wordCount: parsedWordCount,
    ageRange: ageRange ?? book.ageRange,
    genres: genres ?? book.genres,
    coverUrl: coverUrl ?? book.coverUrl,
  });

  res.json(updatedBook);
}));

// Verify (approve/reject) a book
router.patch('/:id/verification', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body as { status?: string; note?: string };
  const user = req.user!;

  const statusValue = status?.toString().toUpperCase();
  if (
    !statusValue ||
    (statusValue !== BookStatus.APPROVED && statusValue !== BookStatus.REJECTED)
  ) {
    throw new AppError('Status must be APPROVED or REJECTED', 400);
  }

  const existingBook = await getBookById(id);

  if (!existingBook) {
    throw new AppError('Book not found', 404);
  }

  const targetStatus =
    statusValue === BookStatus.APPROVED ? BookStatus.APPROVED : BookStatus.REJECTED;
  const verificationNote = note?.trim() || null;
  const now = new Date();

  let pointsAdjustment = 0;
  const updateData: any = {
    status: targetStatus,
    verificationNote,
    verifiedAt: now,
    verifiedById: user.id,
  };

  // New lexile-based points calculation
  // 3 points: book above student lexile
  // 2 points: book at student level (within 50L)
  // 1 point: book below student lexile or no lexile data
  const calculateLexilePoints = async (bookLexile: number | null, userId: string): Promise<number> => {
    if (!bookLexile) {
      return 1; // Default if book has no lexile
    }
    
    const studentLexile = await getStudentCurrentLexile(userId);
    
    if (!studentLexile) {
      return 1; // Default if student has no lexile recorded
    }
    
    if (bookLexile > studentLexile) {
      return 3; // Above level
    } else if (bookLexile >= studentLexile - 50) {
      return 2; // At level (within 50L below)
    } else {
      return 1; // Below level
    }
  };

  const currentPoints = await calculateLexilePoints(existingBook.lexileLevel, existingBook.userId);
  const previouslyAwarded = existingBook.pointsAwardedValue ?? 0;

  if (targetStatus === BookStatus.APPROVED) {
    updateData.pointsAwarded = true;
    updateData.pointsAwardedValue = currentPoints;
    if (!existingBook.pointsAwarded) {
      pointsAdjustment = currentPoints;
    } else {
      pointsAdjustment = currentPoints - previouslyAwarded;
    }
  } else {
    if (existingBook.pointsAwarded) {
      pointsAdjustment = -previouslyAwarded;
    }
    updateData.pointsAwarded = false;
    updateData.pointsAwardedValue = 0;
  }

  const updatedBookRaw = await updateBook(id, updateData);
  const updatedBook = await getBookWithRelations(id);

  if (pointsAdjustment !== 0) {
    await upsertPoint({
      userId: updatedBookRaw.userId,
      increment: pointsAdjustment,
    });
  }

  const io = req.app.get('io');
  io.emit('book:verified', { bookId: updatedBook.id, status: targetStatus });
  io.emit('leaderboard:update');

  res.json(updatedBook);
}));

// Delete book
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const book = await getBookById(id);

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  // Only the book owner or librarian can delete
  if (book.userId !== user.id && user.role !== 'LIBRARIAN') {
    throw new AppError('Access denied', 403);
  }

  await deleteBook(id);

  // Deduct points if they were previously awarded
  if (book.pointsAwarded && book.pointsAwardedValue && book.pointsAwardedValue > 0) {
    await updatePoints(book.userId, { decrement: book.pointsAwardedValue });
  }

  res.json({ message: 'Book deleted successfully' });
}));

/**
 * Background function to search for book information and update the book record
 * Runs asynchronously after book is created
 * Note: Points are now lexile-based and calculated at verification time, not from word count
 */
async function searchAndUpdateBook(bookId: string, title: string, author: string): Promise<void> {
  try {
    console.log(`Searching for book info: ${title} by ${author}`);
    const searchResults = await searchBookInfo(title, author);

    // Get current book to merge genres
    const currentBook = await getBookById(bookId);

    // Only update if we found new information
    const updateData: Partial<{
      wordCount: number | null;
      genres: string[];
    }> = {};

    // Only update wordCount if we don't already have one or if search found one
    if (searchResults.wordCount !== null && !currentBook?.wordCount) {
      updateData.wordCount = searchResults.wordCount;
    }
    
    // Merge genres: combine existing genres with search results, removing duplicates
    if (searchResults.genres.length > 0) {
      const existingGenres = currentBook?.genres || [];
      const mergedGenres = [...new Set([...existingGenres, ...searchResults.genres])];
      // Only update if we have new genres to add
      if (mergedGenres.length > existingGenres.length) {
        updateData.genres = mergedGenres;
      }
    }

    // Only update if we have new data to add
    if (Object.keys(updateData).length > 0 && currentBook) {
      await updateBook(bookId, updateData);
      console.log(`Updated book ${bookId} with search results:`, updateData);
    } else {
      console.log(`No additional information found for book ${bookId}`);
    }
  } catch (error: any) {
    // Log error but don't throw - this is a background process
    console.error(`Error updating book ${bookId} with search results:`, error.message);
  }
}

export default router;

