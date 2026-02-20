import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
  MILESTONES,
  TIER_IMAGE_KEYS,
  getTierProgress,
} from "@/lib/reading-tiers"

const milestones = MILESTONES

type MilestoneStatus = "unlocked" | "current" | "locked"

interface MilestoneWithStatus {
  key: string
  name: string
  threshold: number
  icon: string
  circleBg: string
  circleBorder: string
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
  const tierProgress = getTierProgress(currentPoints)
  const nextUnlockLabel = tierProgress.nextTierName ?? "—"

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
            {/* Tier Display */}
            <div className="flex items-center gap-3">
              <Badge
                variant="default"
                className="text-3xl font-extrabold px-4 py-2 h-auto"
              >
                {tierProgress.tierName}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 space-y-2">
              <Progress value={tierProgress.progressInTier * 100} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {currentPoints.toLocaleString()} / {tierProgress.nextThreshold.toLocaleString()}{" "}
                  pts
                </span>
                <span>{tierProgress.tierName}</span>
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

      {/* Reading Tiers Card - Tabbed */}
      <Card>
        <CardHeader>
          <CardTitle>Reading Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="redstone" className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 p-2">
              {milestonesWithStatus.map((milestone) => {
                const useImage = TIER_IMAGE_KEYS.includes(milestone.key)
                return (
                  <TabsTrigger
                    key={milestone.key}
                    value={milestone.key}
                    className="flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-background"
                  >
                    {useImage ? (
                      <img
                        src={`/images/tiers/${milestone.key}.png`}
                        alt={milestone.name}
                        className={`w-6 h-6 object-contain ${milestone.status === "unlocked" || milestone.status === "current" ? "animate-glow-pulse-subtle-tabs animate-pulse-scale-subtle-tabs" : milestone.status === "locked" ? "opacity-50 blur-[2px]" : ""}`}
                      />
                    ) : (
                      <span className="text-base">{milestone.icon}</span>
                    )}
                    <span className="hidden sm:inline">{milestone.name}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {milestonesWithStatus.map((milestone) => {
              const prevMilestone =
                milestones[
                  milestones.findIndex((m) => m.key === milestone.key) - 1
                ]
              const prevThreshold = prevMilestone?.threshold || 0
              const range = milestone.threshold - prevThreshold
              const milestoneProgress =
                milestone.status === "unlocked" || milestone.status === "current"
                  ? 1
                  : range <= 0
                  ? 0
                  : Math.min(
                      1,
                      Math.max(
                        0,
                        (currentPoints - prevThreshold) / range
                      )
                    )
              const isUnlocked = milestone.status === "unlocked"
              const isCurrent = milestone.status === "current"
              const isLocked = milestone.status === "locked"

              return (
                <TabsContent
                  key={milestone.key}
                  value={milestone.key}
                  className="mt-6"
                >
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    {/* Centered icon or image */}
                    <div
                      className={`
                        w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center text-5xl mb-6 overflow-hidden
                        border-2 transition-all duration-200
                        ${milestone.circleBg} ${milestone.circleBorder}
                        ${
                          isCurrent
                            ? "shadow-lg shadow-primary/30 tier-circle-pulse"
                            : isLocked
                            ? "opacity-50 blur-sm"
                            : ""
                        }
                      `}
                    >
                      {TIER_IMAGE_KEYS.includes(milestone.key) ? (
                        <img
                          src={`/images/tiers/${milestone.key}.png`}
                          alt={milestone.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span>{milestone.icon}</span>
                      )}
                    </div>
                    <p
                      className={`text-lg font-semibold mb-1 ${
                        isLocked ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {milestone.name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {milestone.threshold} pts
                      {isCurrent && " · Current tier"}
                      {isUnlocked && " · Unlocked"}
                      {isLocked && " · Locked"}
                    </p>
                    {/* Progress bar underneath */}
                    <div className="w-full max-w-xs space-y-2">
                      <Progress value={milestoneProgress * 100} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{prevThreshold} pts</span>
                        <span>
                          {milestone.status === "locked"
                            ? `${Math.min(currentPoints, milestone.threshold)} / ${milestone.threshold} pts`
                            : "Unlocked"}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
