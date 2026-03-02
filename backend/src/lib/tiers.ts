/**
 * Reading tier thresholds. Must match frontend MILESTONES in reading-tiers.ts.
 * Used for analytics: map student points to tier.
 */

export interface TierInfo {
  key: string;
  name: string;
  threshold: number;
}

export const TIER_THRESHOLDS: TierInfo[] = [
  { key: 'redstone', name: 'Beginner', threshold: 50 },
  { key: 'copper', name: 'Explorer', threshold: 60 },
  { key: 'emerald', name: 'Guardian', threshold: 75 },
  { key: 'lapis', name: 'Champion', threshold: 125 },
  { key: 'iron', name: 'Master', threshold: 200 },
  { key: 'gold', name: 'Hero', threshold: 400 },
  { key: 'diamond', name: 'Legend', threshold: 800 },
  { key: 'obsidian', name: 'Mythic', threshold: 1200 },
  { key: 'netherite', name: 'Apex', threshold: 2000 },
];

/** Students below first threshold are "Starter" (no certificate tier). */
export const STARTER_KEY = 'starter';
export const STARTER_NAME = 'Starter';

/**
 * Get tier key and name for a given point total.
 * Returns highest tier the points qualify for.
 */
export function getTierFromPoints(points: number): { key: string; name: string } {
  let matched: TierInfo | null = null;
  for (const tier of TIER_THRESHOLDS) {
    if (points >= tier.threshold) {
      matched = tier;
    }
  }
  if (matched) return { key: matched.key, name: matched.name };
  return { key: STARTER_KEY, name: STARTER_NAME };
}
