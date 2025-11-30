-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('Finance', 'Health', 'PersonalGrowth', 'Career', 'Education', 'Fitness');

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "category" "GoalCategory";
