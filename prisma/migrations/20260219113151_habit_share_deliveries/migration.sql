-- CreateTable
CREATE TABLE "habit_share_deliveries" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "message" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_share_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habit_share_deliveries_recipientId_createdAt_idx" ON "habit_share_deliveries"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "habit_share_deliveries_linkId_recipientId_key" ON "habit_share_deliveries"("linkId", "recipientId");

-- AddForeignKey
ALTER TABLE "habit_share_deliveries" ADD CONSTRAINT "habit_share_deliveries_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "habit_share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_share_deliveries" ADD CONSTRAINT "habit_share_deliveries_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_share_deliveries" ADD CONSTRAINT "habit_share_deliveries_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
