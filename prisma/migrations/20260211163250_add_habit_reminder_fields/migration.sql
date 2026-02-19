/*
  Warnings:

  - A unique constraint covering the columns `[habitId]` on the table `reminders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderRepeat" TEXT,
ADD COLUMN     "reminderTime" TEXT;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "habitId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "reminders_habitId_key" ON "reminders"("habitId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
