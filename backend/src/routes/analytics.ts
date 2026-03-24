import express from 'express';
import { Role, BookStatus } from '../types/database';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  findUsers,
  getPointsByUserIds,
  findBooks,
  getTierAwardsByUserIds,
  upsertTierAward,
  deleteTierAward,
} from '../lib/db-helpers';
import { getTierFromPoints, TIER_THRESHOLDS, STARTER_KEY, STARTER_NAME } from '../lib/tiers';

const router = express.Router();

export type GroupBy = 'school' | 'grade' | 'class';

interface StudentWithTier {
  id: string;
  name: string;
  surname: string | null;
  grade: number | null;
  class: string | null;
  points: number;
  tierKey: string;
  tierName: string;
  tierDates: Record<string, string | null>;
  isTierAwarded: boolean;
}

/** GET /api/analytics/tier-breakdown?groupBy=school|grade|class&tier=optionalTierKey */
router.get('/tier-breakdown', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const groupBy = (req.query.groupBy as GroupBy) || 'school';
  const tierFilter = typeof req.query.tier === 'string' && req.query.tier.trim() ? req.query.tier.trim() : null;

  if (!['school', 'grade', 'class'].includes(groupBy)) {
    throw new AppError('Invalid groupBy: use school, grade, or class', 400);
  }

  const users = await findUsers({ role: Role.STUDENT });
  if (users.length === 0) {
    const tierNames = [STARTER_NAME, ...TIER_THRESHOLDS.map(t => t.name)];
    return res.json({
      groups: [],
      tierNames,
      tierKeys: [STARTER_KEY, ...TIER_THRESHOLDS.map(t => t.key)],
    });
  }

  const userIds = users.map(u => u.id);
  let pointsByUserId = new Map<string, number>();
  let awardedTierKeysByUserId = new Map<string, Set<string>>();

  try {
    const pointsRows = await getPointsByUserIds(userIds);
    pointsByUserId = new Map(pointsRows.map(p => [p.userId, p.totalPoints]));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    // If the points table does not exist in the production database yet,
    // fall back to treating all students as having 0 points instead of
    // failing the entire analytics request.
    if (err.code === '42P01') {
      // eslint-disable-next-line no-console
      console.warn(
        'Points table is missing when fetching analytics; treating all students as 0 points.',
      );
    } else {
      throw error;
    }
  }

  try {
    const awards = await getTierAwardsByUserIds(userIds);
    awardedTierKeysByUserId = awards.reduce<Map<string, Set<string>>>((acc, row) => {
      const existing = acc.get(row.userId) ?? new Set<string>();
      existing.add(row.tierKey);
      acc.set(row.userId, existing);
      return acc;
    }, new Map<string, Set<string>>());
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== '42P01') {
      throw error;
    }
  }

  // Fetch approved books to derive when each tier was first reached
  const approvedBooks = await findBooks({
    userId: userIds,
    status: BookStatus.APPROVED,
  });

  const booksByUserId = new Map<string, typeof approvedBooks>();
  for (const book of approvedBooks) {
    if (!book.pointsAwarded || !book.pointsAwardedValue || book.pointsAwardedValue <= 0) continue;
    const list = booksByUserId.get(book.userId) ?? [];
    list.push(book);
    booksByUserId.set(book.userId, list);
  }

  const tierThresholds = [
    { key: STARTER_KEY, threshold: 0 },
    ...TIER_THRESHOLDS.map(t => ({ key: t.key, threshold: t.threshold })),
  ];

  const students: StudentWithTier[] = users.map(user => {
    const points = pointsByUserId.get(user.id) ?? 0;
    const { key: tierKey, name: tierName } = getTierFromPoints(points);
    const tierAwards = awardedTierKeysByUserId.get(user.id) ?? new Set<string>();

    // Calculate when each tier was first reached based on approved books
    const tierDates: Record<string, string | null> = {};
    for (const t of tierThresholds) {
      tierDates[t.key] = null;
    }

    const booksForUser = (booksByUserId.get(user.id) ?? []).sort((a, b) => {
      const aTime = (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as unknown as string)).getTime();
      const bTime = (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as unknown as string)).getTime();
      return aTime - bTime;
    });

    let runningPoints = 0;
    for (const book of booksForUser) {
      runningPoints += book.pointsAwardedValue ?? 0;
      for (const t of tierThresholds) {
        if (tierDates[t.key]) continue;
        if (runningPoints >= t.threshold) {
          const createdAt = book.createdAt instanceof Date
            ? book.createdAt
            : new Date(book.createdAt as unknown as string);
          tierDates[t.key] = createdAt.toISOString();
        }
      }
    }

    return {
      id: user.id,
      name: user.name,
      surname: user.surname,
      grade: user.grade,
      class: user.class,
      points,
      tierKey,
      tierName,
      tierDates,
      isTierAwarded: tierAwards.has(tierKey),
    };
  });

  let filtered = students;
  if (tierFilter) {
    filtered = students.filter(s => s.tierKey === tierFilter);
  }

  const tierKeysForResponse = tierFilter
    ? [tierFilter]
    : [STARTER_KEY, ...TIER_THRESHOLDS.map(t => t.key)];
  const tierNamesForResponse = tierFilter
    ? [tierFilter === STARTER_KEY ? STARTER_NAME : (TIER_THRESHOLDS.find(t => t.key === tierFilter)?.name ?? tierFilter)]
    : [STARTER_NAME, ...TIER_THRESHOLDS.map(t => t.name)];

  type GroupKey = string;
  const groupsMap = new Map<GroupKey, Record<string, number>>();

  function getGroupKey(s: StudentWithTier): GroupKey {
    if (groupBy === 'school') return 'School';
    if (groupBy === 'grade') return s.grade != null ? `Grade ${s.grade}` : 'No grade';
    if (groupBy === 'class') {
      const gradePart = s.grade != null ? `Grade ${s.grade}` : 'Grade ?';
      const classPart = s.class || '?';
      return `${gradePart} - ${classPart}`;
    }
    return 'School';
  }

  for (const s of filtered) {
    const key = getGroupKey(s);
    if (!groupsMap.has(key)) {
      const counts: Record<string, number> = {};
      for (const t of tierKeysForResponse) counts[t] = 0;
      groupsMap.set(key, counts);
    }
    const counts = groupsMap.get(key)!;
    counts[s.tierKey] = (counts[s.tierKey] ?? 0) + 1;
  }

  const groups = Array.from(groupsMap.entries())
    .map(([name, tierCounts]) => {
      const total = Object.values(tierCounts).reduce((a, b) => a + b, 0);
      return { name, tierCounts, total };
    })
    .sort((a, b) => {
      if (groupBy === 'school') return 0;
      if (groupBy === 'grade') {
        const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }
      return a.name.localeCompare(b.name);
    });

  const studentsForResponse = filtered.map(s => ({
    id: s.id,
    name: s.name,
    surname: s.surname,
    grade: s.grade,
    class: s.class,
    points: s.points,
    tierKey: s.tierKey,
    tierName: s.tierName,
    tierDates: s.tierDates,
    isTierAwarded: s.isTierAwarded,
  }));

  res.json({
    groups,
    tierNames: tierNamesForResponse,
    tierKeys: tierKeysForResponse,
    students: studentsForResponse,
  });
}));

router.patch('/tier-award', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { studentId, tierKey, awarded } = req.body as {
    studentId?: string;
    tierKey?: string;
    awarded?: boolean;
  };

  if (!studentId || !tierKey || typeof awarded !== 'boolean') {
    throw new AppError('studentId, tierKey and awarded are required', 400);
  }

  const allowedTierKeys = new Set([STARTER_KEY, ...TIER_THRESHOLDS.map((t) => t.key)]);
  if (!allowedTierKeys.has(tierKey)) {
    throw new AppError('Invalid tier key', 400);
  }

  const student = await findUsers({ id: studentId });
  if (student.length === 0 || student[0].role !== Role.STUDENT) {
    throw new AppError('Student not found', 404);
  }

  try {
    if (awarded) {
      await upsertTierAward({
        userId: studentId,
        tierKey,
        awardedById: req.user?.id ?? null,
      });
    } else {
      await deleteTierAward(studentId, tierKey);
    }
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '42P01') {
      throw new AppError(
        'Tier awards are not available yet. Please run the latest database migration for TierAward.',
        503,
      );
    }
    throw error;
  }

  res.json({ success: true });
}));

export default router;
