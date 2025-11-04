import express from 'express';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { searchBookInfo } from '../services/bookSearch';

const router = express.Router();

// Get books with filtering based on role
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { userId, grade, class: className, sortBy = 'createdAt', order = 'desc' } = req.query;

  let where: any = {};

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
  }
  // Librarians see all books (no filter)

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
    },
  });

  // Add 10 points
  await prisma.point.update({
    where: { userId: user.id },
    data: {
      totalPoints: { increment: 10 },
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

  // Only the book owner can update
  if (book.userId !== user.id) {
    throw new AppError('Access denied', 403);
  }

  const { title, author, rating, comment, lexileLevel, wordCount, ageRange, genres, coverUrl } = req.body;

  const updatedBook = await prisma.book.update({
    where: { id },
    data: {
      title,
      author,
      rating,
      comment,
      lexileLevel: lexileLevel ? parseInt(lexileLevel) : book.lexileLevel,
      wordCount: wordCount ? parseInt(wordCount) : book.wordCount,
      ageRange,
      genres: genres || book.genres,
      coverUrl,
    },
  });

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

  // Deduct 10 points if deleted by the owner
  if (book.userId === user.id) {
    await prisma.point.update({
      where: { userId: user.id },
      data: {
        totalPoints: { decrement: 10 },
      },
    });
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
      select: { wordCount: true, genres: true },
    });

    // Only update if we found new information
    const updateData: any = {};
    
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
    if (Object.keys(updateData).length > 0) {
      await prisma.book.update({
        where: { id: bookId },
        data: updateData,
      });
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

