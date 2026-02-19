import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Tooltip } from "./ui/tooltip"
import { Separator } from "./ui/separator"

// Milestones configuration
const milestones = [
  { key: "redstone", name: "Redstone", threshold: 50, icon: "🟥" },
  { key: "emerald", name: "Emerald", threshold: 75, icon: "💚" },
  { key: "lapis", name: "Lapis", threshold: 125, icon: "🟦" },
  { key: "iron", name: "Iron", threshold: 200, icon: "⬜️" },
  { key: "silver", name: "Silver", threshold: 400, icon: "🪙" },
  { key: "gold", name: "Gold", threshold: 600, icon: "🟨" },
  { key: "platinum", name: "Platinum", threshold: 800, icon: "⬜️" },
  { key: "diamond", name: "Diamond", threshold: 1000, icon: "💎" },
  { key: "obsidian", name: "Obsidian", threshold: 2000, icon: "🟪" },
]

type MilestoneStatus = "unlocked" | "current" | "locked"

interface MilestoneWithStatus {
  key: string
  name: string
  threshold: number
  icon: string
  status: MilestoneStatus
}

interface PointsSystemPanelProps {
  currentPoints: number
  showMaterialsOnly?: boolean
}

export const PointsSystemPanel: React.FC<PointsSystemPanelProps> = ({
  currentPoints = 0,
  showMaterialsOnly = false,
}) => {
  // Calculate level and XP from points
  // Level increases every 100 points, starting at level 1
  const level = Math.floor(currentPoints / 100) + 1
  const xpPerLevel = 100
  const currentXP = currentPoints % xpPerLevel
  const xpToNextLevel = xpPerLevel
  
  // Generate next unlock label based on level
  const nextUnlockLabel = `Level ${level + 1}`

  // Calculate milestone statuses
  const milestonesWithStatus: MilestoneWithStatus[] = milestones.map(
    (milestone, index) => {
      if (currentPoints >= milestone.threshold) {
        // Check if this is the highest unlocked tier
        const isHighestUnlocked =
          index === milestones.length - 1 ||
          currentPoints < milestones[index + 1].threshold
        return {
          ...milestone,
          status: isHighestUnlocked ? "current" : "unlocked",
        }
      }
      return { ...milestone, status: "locked" }
    }
  )

  // Find current tier
  const currentTier = milestonesWithStatus.find((m) => m.status === "current")
  const nextTier = milestonesWithStatus.find((m) => m.status === "locked")
  const isMaxTier = !nextTier

  // Calculate progress to next tier
  const currentTierThreshold = currentTier?.threshold || 0
  const nextTierThreshold = nextTier?.threshold || currentTierThreshold
  const pointsToNext = Math.max(0, nextTierThreshold - currentPoints)
  const tierProgress =
    currentTierThreshold === nextTierThreshold
      ? 1
      : (currentPoints - currentTierThreshold) /
        (nextTierThreshold - currentTierThreshold)

  // XP progress calculation
  const xpProgress = currentXP / xpToNextLevel

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* XP Card */}
      {!showMaterialsOnly && (
      <Card>
        <CardHeader>
          <CardTitle>Reading XP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Level Display */}
            <div className="flex items-center gap-3">
              <Badge
                variant="default"
                className="text-3xl font-extrabold px-4 py-2 h-auto"
              >
                Level {level}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 space-y-2">
              <Progress value={xpProgress * 100} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {currentXP.toLocaleString()} / {xpToNextLevel.toLocaleString()}{" "}
                  XP
                </span>
                <span>Level {level}</span>
              </div>
            </div>

            {/* Next Unlock */}
            <div className="md:text-right">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Next unlock
              </div>
              <div className="text-sm font-semibold">{nextUnlockLabel}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Reading Tiers Card */}
      <Card>
        <CardHeader>
          <CardTitle>Reading Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Milestone Track - Desktop */}
          <div className="hidden md:block">
            <div className="relative flex items-center justify-between py-4">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />

              {/* Milestone nodes */}
              {milestonesWithStatus.map((milestone) => {
                const isUnlocked = milestone.status === "unlocked"
                const isCurrent = milestone.status === "current"

                return (
                  <Tooltip
                    key={milestone.key}
                    content={
                      <div className="text-center space-y-1">
                        <div className="font-bold">{milestone.name}</div>
                        <div className="text-xs">
                          {milestone.threshold} pts
                        </div>
                        <div className="text-xs capitalize">
                          {milestone.status}
                        </div>
                      </div>
                    }
                  >
                    <div
                      className={`
                        relative z-10 flex flex-col items-center gap-2
                        ${isCurrent ? "scale-110" : ""}
                      `}
                    >
                      {/* Node circle */}
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center text-2xl
                          border-2 transition-all duration-200
                          ${
                            isCurrent
                              ? "bg-primary/20 border-primary shadow-lg shadow-primary/30"
                              : isUnlocked
                              ? "bg-secondary border-secondary-foreground/30"
                              : "bg-muted border-muted-foreground/20 opacity-50"
                          }
                        `}
                      >
                        {milestone.icon}
                      </div>
                      {/* Label */}
                      <span
                        className={`
                          text-xs font-medium text-center
                          ${
                            isCurrent || isUnlocked
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        `}
                      >
                        {milestone.name}
                      </span>
                    </div>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          {/* Milestone List - Mobile */}
          <div className="md:hidden space-y-3">
            {milestonesWithStatus.map((milestone) => {
              const isUnlocked = milestone.status === "unlocked"
              const isCurrent = milestone.status === "current"

              // Calculate progress for this milestone
              const prevMilestone =
                milestones[
                  milestones.findIndex((m) => m.key === milestone.key) - 1
                ]
              const prevThreshold = prevMilestone?.threshold || 0
              const milestoneProgress =
                isUnlocked || isCurrent
                  ? 1
                  : Math.min(
                      1,
                      Math.max(
                        0,
                        (currentPoints - prevThreshold) /
                          (milestone.threshold - prevThreshold)
                      )
                    )

              return (
                <Tooltip
                  key={milestone.key}
                  content={
                    <div className="text-center space-y-1">
                      <div className="font-bold">{milestone.name}</div>
                      <div className="text-xs">
                        {milestone.threshold} pts
                      </div>
                      <div className="text-xs capitalize">
                        {milestone.status}
                      </div>
                    </div>
                  }
                >
                  <div
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2
                      ${
                        isCurrent
                          ? "bg-primary/10 border-primary"
                          : isUnlocked
                          ? "bg-secondary/50 border-secondary-foreground/20"
                          : "bg-muted/30 border-muted-foreground/10"
                      }
                    `}
                  >
                    {/* Icon */}
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-xl
                        ${
                          isCurrent || isUnlocked
                            ? "bg-background"
                            : "bg-muted opacity-50"
                        }
                      `}
                    >
                      {milestone.icon}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`
                            text-sm font-semibold
                            ${
                              isCurrent || isUnlocked
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          `}
                        >
                          {milestone.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {milestone.threshold} pts
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <Progress
                        value={milestoneProgress * 100}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </Tooltip>
              )
            })}
          </div>

          <Separator />

          {/* Current Tier Info */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Current tier:{" "}
                </span>
                <span className="text-sm font-semibold">
                  {currentTier?.name} ({currentTierThreshold} pts)
                </span>
              </div>
              <div>
                {isMaxTier ? (
                  <span className="text-sm font-semibold text-primary">
                    Max tier reached
                  </span>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    Points to next tier:{" "}
                    <span className="font-semibold text-foreground">
                      {pointsToNext}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Tier Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentTierThreshold} pts</span>
                <span>
                  {isMaxTier
                    ? "Max tier"
                    : `${nextTierThreshold} pts (${nextTier?.name})`}
                </span>
              </div>
              <Progress value={isMaxTier ? 100 : tierProgress * 100} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
