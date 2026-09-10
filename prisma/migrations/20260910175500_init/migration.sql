-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "UnlockKind" AS ENUM ('POINTS', 'ACHIEVEMENT');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "gardenSeed" INTEGER NOT NULL DEFAULT 0,
    "currentPlotCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "scheduleMask" INTEGER NOT NULL,
    "targetPerDay" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Completion" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayRollup" (
    "userId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "scheduled" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "streakLength" INTEGER NOT NULL,
    "gracedDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DayRollup_pkey" PRIMARY KEY ("userId","localDate")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "unlockKind" "UnlockKind" NOT NULL,
    "unlockAtPoints" INTEGER,
    "achievementKey" TEXT,
    "spriteKey" TEXT NOT NULL,
    "stageCount" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plotIndex" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "placementOrder" INTEGER NOT NULL,
    "isFeatureSlot" BOOLEAN NOT NULL DEFAULT false,
    "speciesId" TEXT NOT NULL,
    "unlockedAtPoints" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesUnlock" (
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeciesUnlock_pkey" PRIMARY KEY ("userId","speciesId")
);

-- CreateTable
CREATE TABLE "AchievementUnlock" (
    "userId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "earnedOnDate" DATE NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementUnlock_pkey" PRIMARY KEY ("userId","achievementKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Habit_userId_archivedAt_idx" ON "Habit"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Completion_userId_localDate_idx" ON "Completion"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_habitId_localDate_key" ON "Completion"("habitId", "localDate");

-- CreateIndex
CREATE INDEX "DayRollup_userId_localDate_idx" ON "DayRollup"("userId", "localDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Species_key_key" ON "Species"("key");

-- CreateIndex
CREATE INDEX "Tile_userId_plotIndex_idx" ON "Tile"("userId", "plotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Tile_userId_plotIndex_x_y_key" ON "Tile"("userId", "plotIndex", "x", "y");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayRollup" ADD CONSTRAINT "DayRollup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tile" ADD CONSTRAINT "Tile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tile" ADD CONSTRAINT "Tile_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesUnlock" ADD CONSTRAINT "SpeciesUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesUnlock" ADD CONSTRAINT "SpeciesUnlock_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementUnlock" ADD CONSTRAINT "AchievementUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
