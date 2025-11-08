import express from 'express';
import { BookStatus } from '@prisma/client';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { searchBookInfo } from '../services/bookSearch';

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

  // Apply role-based filtering
  if (user.role === 'STUDENT') {
    where.userId = user.id;
  } else if (user.role === 'TEACHER') {
    // Teachers see books from their grade/class
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        grade: user.grade,
        class: user.class,
      },
      select: { id: true },
    });
    where.userId = { in: students.map(s => s.id) };
    if (!statusParam) {
      where.status = BookStatus.APPROVED;
    }
  } else if (!statusParam && user.role !== 'LIBRARIAN') {
    // Default to approved for non-student, non-librarian roles
    where.status = BookStatus.APPROVED;
  }
  // Librarians see all books unless a status filter is supplied

  // Apply additional filters
  if (userId) where.userId = userId as string;
  if (grade) {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', grade: parseInt(grade as string) },
      select: { id: true },
    });
    where.userId = { in: students.map(s => s.id) };
  }
  if (className) {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', class: className as string },
      select: { id: true },
    });
    where.userId = { in: students.map(s => s.id) };
  }

  const books = await prisma.book.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          grade: true,
          class: true,
        },
      },
      comments: {
        include: {
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      verifiedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      [sortBy as string]: order as 'asc' | 'desc',
    },
  });

  res.json(books);
}));

// Get single book
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          grade: true,
          class: true,
        },
      },
      comments: {
        include: {
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      verifiedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  // Check permissions
  if (user.role === 'STUDENT' && book.userId !== user.id) {
    throw new AppError('Access denied', 403);
  }

  res.json(book);
}));

// Create a new book log
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;

  if (user.role !== 'STUDENT') {
    throw new AppError('Only students can log books', 403);
  }

  const { title, author, rating, comment, lexileLevel, wordCount, ageRange, genres, coverUrl } = req.body;

  // Validate required fields
  if (!title || !author || !rating) {
    throw new AppError('Title, author, and rating are required', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  // Create book immediately with user-provided data
  const book = await prisma.book.create({
    data: {
      title,
      author,
      rating,
      comment,
      lexileLevel: lexileLevel ? parseInt(lexileLevel) : null,
      wordCount: wordCount ? parseInt(wordCount) : null,
      ageRange,
      genres: genres || [],
      coverUrl,
      userId: user.id,
      status: BookStatus.PENDING,
    },
  });

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('book:logged', { bookId: book.id, userId: user.id });
  io.emit('leaderboard:update');

  // Trigger asynchronous background search for word count and genre
  // Don't await - let it run in the background
  searchAndUpdateBook(book.id, title, author).catch((error) => {
    console.error(`Failed to update book ${book.id} with search results:`, error);
  });

  res.status(201).json(book);
}));

// Update book
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  const book = await prisma.book.findUnique({ where: { id } });

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

  const updatedBook = await prisma.book.update({
    where: { id },
    data: {
      title: title ?? book.title,
      author: author ?? book.author,
      rating: rating ?? book.rating,
      comment: comment ?? book.comment,
      lexileLevel: parsedLexile,
      wordCount: parsedWordCount,
      ageRange: ageRange ?? book.ageRange,
      genres: genres ?? book.genres,
      coverUrl: coverUrl ?? book.coverUrl,
    },
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

  const existingBook = await prisma.book.findUnique({
    where: { id },
  });

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

  const calculatePoints = (wordCount?: number | null) =>
    wordCount && wordCount > 0 ? Math.floor(wordCount / 1000) : 0;

  const currentPoints = calculatePoints(existingBook.wordCount);
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

  const updatedBook = await prisma.book.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          grade: true,
          class: true,
        },
      },
      comments: {
        include: {
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      verifiedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (pointsAdjustment !== 0) {
    if (pointsAdjustment > 0) {
      await prisma.point.upsert({
        where: { userId: updatedBook.userId },
        update: {
          totalPoints: { increment: pointsAdjustment },
        },
        create: {
          userId: updatedBook.userId,
          totalPoints: pointsAdjustment,
        },
      });
    } else {
      await prisma.point.update({
        where: { userId: updatedBook.userId },
        data: {
          totalPoints: { increment: pointsAdjustment },
        },
      });
    }
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

  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  // Only the book owner or librarian can delete
  if (book.userId !== user.id && user.role !== 'LIBRARIAN') {
    throw new AppError('Access denied', 403);
  }

  await prisma.book.delete({ where: { id } });

  // Deduct points if they were previously awarded
  if (book.pointsAwarded) {
    const calculatePoints = (wordCount?: number | null) =>
      wordCount && wordCount > 0 ? Math.floor(wordCount / 1000) : 0;
    const pointsToDeduct =
      book.pointsAwardedValue && book.pointsAwardedValue > 0
        ? book.pointsAwardedValue
        : calculatePoints(book.wordCount);

    if (pointsToDeduct !== 0) {
      await prisma.point.updateMany({
        where: { userId: book.userId },
        data: {
          totalPoints: { decrement: pointsToDeduct },
        },
      });
    }
  }

  res.json({ message: 'Book deleted successfully' });
}));

/**
 * Background function to search for book information and update the book record
 * Runs asynchronously after book is created
 */
async function searchAndUpdateBook(bookId: string, title: string, author: string): Promise<void> {
  try {
    console.log(`Searching for book info: ${title} by ${author}`);
    const searchResults = await searchBookInfo(title, author);

    // Get current book to merge genres
    const currentBook = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        wordCount: true,
        genres: true,
        pointsAwarded: true,
        pointsAwardedValue: true,
        status: true,
        userId: true,
      },
    });

    // Only update if we found new information
    const updateData: any = {};
    const calculatePoints = (wordCount?: number | null) =>
      wordCount && wordCount > 0 ? Math.floor(wordCount / 1000) : 0;
    let pointsDiff = 0;

    // Only update wordCount if we don't already have one or if search found one
    if (searchResults.wordCount !== null && !currentBook?.wordCount) {
      updateData.wordCount = searchResults.wordCount;
      if (currentBook?.pointsAwarded) {
        const newPoints = calculatePoints(searchResults.wordCount);
        const previousPoints = currentBook.pointsAwardedValue ?? 0;
        if (newPoints !== previousPoints) {
          updateData.pointsAwardedValue = newPoints;
          pointsDiff = newPoints - previousPoints;
        }
      }
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
    if (Object.keys(updateData).length > 0) {
      await prisma.book.update({
        where: { id: bookId },
        data: updateData,
      });
      if (pointsDiff !== 0 && currentBook?.userId) {
        if (pointsDiff > 0) {
          await prisma.point.upsert({
            where: { userId: currentBook.userId },
            update: {
              totalPoints: { increment: pointsDiff },
            },
            create: {
              userId: currentBook.userId,
              totalPoints: pointsDiff,
            },
          });
        } else {
          await prisma.point.update({
            where: { userId: currentBook.userId },
            data: {
              totalPoints: { increment: pointsDiff },
            },
          });
        }
      }
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

