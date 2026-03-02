import express from 'express';
import { Role } from '../types/database';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { findUsers, getPointsByUserIds } from '../lib/db-helpers';
import { getTierFromPoints, TIER_THRESHOLDS, STARTER_KEY, STARTER_NAME } from '../lib/tiers';

const router = express.Router();

export type GroupBy = 'school' | 'grade' | 'class';

interface StudentWithTier {
  id: string;
  grade: number | null;
  class: string | null;
  points: number;
  tierKey: string;
  tierName: string;
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
  const pointsRows = await getPointsByUserIds(userIds);
  const pointsByUserId = new Map(pointsRows.map(p => [p.userId, p.totalPoints]));

  const students: StudentWithTier[] = users.map(user => {
    const points = pointsByUserId.get(user.id) ?? 0;
    const { key: tierKey, name: tierName } = getTierFromPoints(points);
    return {
      id: user.id,
      grade: user.grade,
      class: user.class,
      points,
      tierKey,
      tierName,
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

  res.json({
    groups,
    tierNames: tierNamesForResponse,
    tierKeys: tierKeysForResponse,
  });
}));

export default router;
