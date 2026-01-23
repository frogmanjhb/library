-- CreateTable
CREATE TABLE "StudentLexile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lexile" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLexile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentLexile_userId_idx" ON "StudentLexile"("userId");

-- CreateIndex
CREATE INDEX "StudentLexile_year_term_idx" ON "StudentLexile"("year", "term");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLexile_userId_term_year_key" ON "StudentLexile"("userId", "term", "year");

-- AddForeignKey
ALTER TABLE "StudentLexile" ADD CONSTRAINT "StudentLexile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
