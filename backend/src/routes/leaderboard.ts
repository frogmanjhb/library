import express from 'express';
import { BookStatus } from '../types/database';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  findUsers,
  getPointByUserId,
  findBooks,
  aggregateBooks,
} from '../lib/db-helpers';

const router = express.Router();

// Get leaderboard by grade
router.get('/by-grade', requireAuth, asyncHandler(async (req, res) => {
  const { grade } = req.query;

  if (!grade) {
    return res.status(400).json({ error: 'Grade parameter is required' });
  }

  const users = await findUsers({
    role: 'STUDENT',
    grade: parseInt(grade as string),
  });

  const leaderboardData = await Promise.all(
    users.map(async (user) => {
      const points = await getPointByUserId(user.id);
      const books = await findBooks({
        userId: user.id,
        status: BookStatus.APPROVED,
      });
      return {
        user,
        points,
        booksRead: books.length,
      };
    })
  );

  leaderboardData.sort((a, b) => (b.points?.totalPoints || 0) - (a.points?.totalPoints || 0));

  const formatted = leaderboardData.slice(0, 50).map((item, index) => ({
    rank: index + 1,
    userId: item.user.id,
    name: item.user.name,
    email: item.user.email,
    grade: item.user.grade,
    class: item.user.class,
    totalPoints: item.points?.totalPoints || 0,
    booksRead: item.booksRead,
  }));

  res.json(formatted);
}));

// Get whole school leaderboard
router.get('/school', requireAuth, asyncHandler(async (req, res) => {
  const users = await findUsers({ role: 'STUDENT' });

  const leaderboardData = await Promise.all(
    users.map(async (user) => {
      const points = await getPointByUserId(user.id);
      const books = await findBooks({
        userId: user.id,
        status: BookStatus.APPROVED,
      });
      return {
        user,
        points,
        booksRead: books.length,
      };
    })
  );

  leaderboardData.sort((a, b) => (b.points?.totalPoints || 0) - (a.points?.totalPoints || 0));

  const formatted = leaderboardData.slice(0, 50).map((item, index) => ({
    rank: index + 1,
    userId: item.user.id,
    name: item.user.name,
    email: item.user.email,
    grade: item.user.grade,
    class: item.user.class,
    totalPoints: item.points?.totalPoints || 0,
    booksRead: item.booksRead,
  }));

  res.json(formatted);
}));

// Get leaderboard by most words read
router.get('/words', requireAuth, asyncHandler(async (req, res) => {
  const students = await findUsers({ role: 'STUDENT' });

  const leaderboardData = await Promise.all(
    students.map(async (student) => {
      const result = await aggregateBooks(
        {
          userId: student.id,
          status: BookStatus.APPROVED,
          wordCount: { not: null },
        },
        { _sum: { wordCount: true }, _count: true }
      );

      return {
        userId: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        class: student.class,
        totalWords: result._sum?.wordCount || 0,
        booksRead: result._count || 0,
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
  const students = await findUsers({ role: 'STUDENT' });

  const leaderboardData = await Promise.all(
    students.map(async (student) => {
      const result = await aggregateBooks(
        {
          userId: student.id,
          status: BookStatus.APPROVED,
          lexileLevel: { not: null },
        },
        { _avg: { lexileLevel: true }, _count: true }
      );

      return {
        userId: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        class: student.class,
        avgLexile: Math.round(result._avg?.lexileLevel || 0),
        booksRead: result._count || 0,
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

