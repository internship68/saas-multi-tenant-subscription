-- CreateTable
CREATE TABLE "LineMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineMessage_organizationId_idx" ON "LineMessage"("organizationId");

-- CreateIndex
CREATE INDEX "LineMessage_lineUserId_idx" ON "LineMessage"("lineUserId");

-- CreateIndex
CREATE INDEX "LineMessage_createdAt_idx" ON "LineMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "LineMessage" ADD CONSTRAINT "LineMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
