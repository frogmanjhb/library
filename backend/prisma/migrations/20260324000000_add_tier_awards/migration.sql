-- CreateTable
CREATE TABLE "TierAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierKey" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TierAward_userId_tierKey_key" ON "TierAward"("userId", "tierKey");

-- CreateIndex
CREATE INDEX "TierAward_tierKey_idx" ON "TierAward"("tierKey");

-- CreateIndex
CREATE INDEX "TierAward_awardedAt_idx" ON "TierAward"("awardedAt");

-- AddForeignKey
ALTER TABLE "TierAward" ADD CONSTRAINT "TierAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierAward" ADD CONSTRAINT "TierAward_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
