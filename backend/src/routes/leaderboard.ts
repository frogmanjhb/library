import express from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Get leaderboard by grade
router.get('/by-grade', requireAuth, asyncHandler(async (req, res) => {
  const { grade } = req.query;

  if (!grade) {
    return res.status(400).json({ error: 'Grade parameter is required' });
  }

  const leaderboard = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      grade: parseInt(grade as string),
    },
    include: {
      points: true,
      _count: {
        select: { books: true },
      },
    },
    orderBy: {
      points: {
        totalPoints: 'desc',
      },
    },
    take: 50,
  });

  const formatted = leaderboard.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    name: user.name,
    email: user.email,
    grade: user.grade,
    class: user.class,
    totalPoints: user.points?.totalPoints || 0,
    booksRead: user._count.books,
  }));

  res.json(formatted);
}));

// Get whole school leaderboard
router.get('/school', requireAuth, asyncHandler(async (req, res) => {
  const leaderboard = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
    },
    include: {
      points: true,
      _count: {
        select: { books: true },
      },
    },
    orderBy: {
      points: {
        totalPoints: 'desc',
      },
    },
    take: 50,
  });

  const formatted = leaderboard.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    name: user.name,
    email: user.email,
    grade: user.grade,
    class: user.class,
    totalPoints: user.points?.totalPoints || 0,
    booksRead: user._count.books,
  }));

  res.json(formatted);
}));

// Get leaderboard by most words read
router.get('/words', requireAuth, asyncHandler(async (req, res) => {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      grade: true,
      class: true,
    },
  });

  const leaderboardData = await Promise.all(
    students.map(async (student) => {
      const result = await prisma.book.aggregate({
        where: {
          userId: student.id,
          wordCount: { not: null },
        },
        _sum: { wordCount: true },
        _count: true,
      });

      return {
        userId: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        class: student.class,
        totalWords: result._sum.wordCount || 0,
        booksRead: result._count,
      };
    })
  );

  // Sort by total words
  const sorted = leaderboardData
    .filter(item => item.totalWords > 0)
    .sort((a, b) => b.totalWords - a.totalWords)
    .slice(0, 50);

  const formatted = sorted.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));

  res.json(formatted);
}));

// Get leaderboard by highest average Lexile
router.get('/lexile', requireAuth, asyncHandler(async (req, res) => {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      grade: true,
      class: true,
    },
  });

  const leaderboardData = await Promise.all(
    students.map(async (student) => {
      const result = await prisma.book.aggregate({
        where: {
          userId: student.id,
          lexileLevel: { not: null },
        },
        _avg: { lexileLevel: true },
        _count: true,
      });

      return {
        userId: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        class: student.class,
        avgLexile: Math.round(result._avg.lexileLevel || 0),
        booksRead: result._count,
      };
    })
  );

  // Sort by average Lexile (only include students with at least 3 books)
  const sorted = leaderboardData
    .filter(item => item.booksRead >= 3 && item.avgLexile > 0)
    .sort((a, b) => b.avgLexile - a.avgLexile)
    .slice(0, 50);

  const formatted = sorted.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));

  res.json(formatted);
}));

export default router;

