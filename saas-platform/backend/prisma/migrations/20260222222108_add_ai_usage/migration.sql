/*
  Warnings:

  - You are about to drop the column `courseInterest` on the `LineLead` table. All the data in the column will be lost.
  - You are about to drop the column `grade` on the `LineLead` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `LineLead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LineConversation" ALTER COLUMN "state" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "LineLead" DROP COLUMN "courseInterest",
DROP COLUMN "grade",
DROP COLUMN "phone",
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "gradeLevel" TEXT,
ADD COLUMN     "interestedSubject" TEXT,
ADD COLUMN     "parentName" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_organizationId_idx" ON "Course"("organizationId");

-- CreateIndex
CREATE INDEX "AiUsage_organizationId_idx" ON "AiUsage"("organizationId");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
