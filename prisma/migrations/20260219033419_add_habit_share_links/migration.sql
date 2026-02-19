-- CreateEnum
CREATE TYPE "ShareVisibility" AS ENUM ('PUBLIC', 'FRIENDS_ONLY');

-- CreateTable
CREATE TABLE "habit_share_links" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(80) NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "visibility" "ShareVisibility" NOT NULL DEFAULT 'PUBLIC',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "habit_share_links_token_key" ON "habit_share_links"("token");

-- CreateIndex
CREATE INDEX "habit_share_links_ownerId_idx" ON "habit_share_links"("ownerId");

-- AddForeignKey
ALTER TABLE "habit_share_links" ADD CONSTRAINT "habit_share_links_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
