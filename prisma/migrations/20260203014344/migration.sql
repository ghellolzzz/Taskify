/*
  Warnings:

  - You are about to drop the column `points` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `Theme` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserOwnedTheme` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserOwnedTheme" DROP CONSTRAINT "UserOwnedTheme_themeId_fkey";

-- DropForeignKey
ALTER TABLE "UserOwnedTheme" DROP CONSTRAINT "UserOwnedTheme_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "points";

-- DropTable
DROP TABLE "Theme";

-- DropTable
DROP TABLE "UserOwnedTheme";
