/*
  Warnings:

  - A unique constraint covering the columns `[providerPaymentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerPaymentId" TEXT;

-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "payload" JSONB;

-- CreateTable
CREATE TABLE "LineIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelSecret" TEXT NOT NULL,
    "channelAccessToken" TEXT,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "studentName" TEXT,
    "grade" TEXT,
    "phone" TEXT,
    "courseInterest" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineConversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'INITIAL',
    "lastIntent" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineIntegration_organizationId_idx" ON "LineIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "LineLead_organizationId_idx" ON "LineLead"("organizationId");

-- CreateIndex
CREATE INDEX "LineLead_lineUserId_idx" ON "LineLead"("lineUserId");

-- CreateIndex
CREATE INDEX "LineConversation_organizationId_idx" ON "LineConversation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LineConversation_organizationId_lineUserId_key" ON "LineConversation"("organizationId", "lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- AddForeignKey
ALTER TABLE "LineIntegration" ADD CONSTRAINT "LineIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineLead" ADD CONSTRAINT "LineLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineConversation" ADD CONSTRAINT "LineConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
