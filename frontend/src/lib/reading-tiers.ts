/**
 * Shared reading tier configuration and progress logic.
 * Used by the Reading XP card and Reading Tiers panel.
 */

export interface Milestone {
  key: string
  name: string
  threshold: number
  icon: string
  /** Tailwind classes for central circle background (complementary colour per tier). */
  circleBg: string
  /** Tailwind classes for central circle border. */
  circleBorder: string
}

export const MILESTONES: Milestone[] = [
  { key: "redstone", name: "Beginner", threshold: 50, icon: "🟥", circleBg: "bg-rose-100", circleBorder: "border-rose-400" },
  { key: "copper", name: "Explorer", threshold: 60, icon: "🟫", circleBg: "bg-amber-100", circleBorder: "border-amber-500" },
  { key: "emerald", name: "Guardian", threshold: 75, icon: "💚", circleBg: "bg-emerald-100", circleBorder: "border-emerald-500" },
  { key: "lapis", name: "Champion", threshold: 125, icon: "🟦", circleBg: "bg-sky-100", circleBorder: "border-sky-500" },
  { key: "iron", name: "Master", threshold: 200, icon: "⬜️", circleBg: "bg-slate-200", circleBorder: "border-slate-500" },
  { key: "gold", name: "Hero", threshold: 400, icon: "🟨", circleBg: "bg-yellow-100", circleBorder: "border-yellow-500" },
  { key: "diamond", name: "Legend", threshold: 800, icon: "💎", circleBg: "bg-cyan-100", circleBorder: "border-cyan-500" },
  { key: "obsidian", name: "Mythic", threshold: 1200, icon: "🟪", circleBg: "bg-violet-100", circleBorder: "border-violet-500" },
  { key: "netherite", name: "Apex", threshold: 2000, icon: "⬛", circleBg: "bg-indigo-100", circleBorder: "border-indigo-500" },
]

export const TIER_IMAGE_KEYS = [
  "redstone",
  "copper",
  "emerald",
  "lapis",
  "iron",
  "gold",
  "diamond",
  "obsidian",
  "netherite",
]

export interface TierProgress {
  /** Current tier index (0-based). -1 if below first tier. */
  tierIndex: number
  /** Display name for current tier (e.g. "Beginner") or "Starter" if below first. */
  tierName: string
  /** Points at start of current segment (0 or previous threshold). */
  prevThreshold: number
  /** Points needed for next tier (or current if max). */
  nextThreshold: number
  /** Progress within current segment 0..1. 1 if at max tier. */
  progressInTier: number
  /** Next tier name for "Next unlock", or null if at max. */
  nextTierName: string | null
  /** Whether user has reached the highest tier. */
  isMaxTier: boolean
}

/**
 * Compute tier progress from total points.
 * Used by Reading XP card and Reading Tiers panel.
 */
export function getTierProgress(points: number): TierProgress {
  const tiers = MILESTONES
  if (tiers.length === 0) {
    return {
      tierIndex: -1,
      tierName: "Starter",
      prevThreshold: 0,
      nextThreshold: 0,
      progressInTier: 0,
      nextTierName: null,
      isMaxTier: true,
    }
  }

  const firstThreshold = tiers[0].threshold
  if (points < firstThreshold) {
    const progress = firstThreshold > 0 ? points / firstThreshold : 0
    return {
      tierIndex: -1,
      tierName: "Starter",
      prevThreshold: 0,
      nextThreshold: firstThreshold,
      progressInTier: Math.min(1, Math.max(0, progress)),
      nextTierName: tiers[0].name,
      isMaxTier: false,
    }
  }

  let currentIndex = 0
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].threshold) {
      currentIndex = i
      break
    }
  }

  const isMaxTier = currentIndex === tiers.length - 1
  const current = tiers[currentIndex]
  const prevThreshold = currentIndex > 0 ? tiers[currentIndex - 1].threshold : 0
  const nextThreshold = isMaxTier ? current.threshold : tiers[currentIndex + 1].threshold
  const range = nextThreshold - prevThreshold
  const progressInTier =
    range <= 0 ? 1 : Math.min(1, Math.max(0, (points - prevThreshold) / range))
  const nextTierName = isMaxTier ? null : tiers[currentIndex + 1].name

  return {
    tierIndex: currentIndex,
    tierName: current.name,
    prevThreshold,
    nextThreshold,
    progressInTier,
    nextTierName,
    isMaxTier,
  }
}
