/*
  Fix duplicate migration:
  - 20260211163250 already added reminderEnabled/reminderRepeat/reminderTime + reminders.habitId
  - This migration should ONLY add new fields + adjust constraints/defaults
*/

-- Ensure reminderRepeat has default + not null (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Habit'
      AND column_name = 'reminderRepeat'
  ) THEN
    ALTER TABLE "Habit"
      ALTER COLUMN "reminderRepeat" SET DEFAULT 'daily';

    UPDATE "Habit"
    SET "reminderRepeat" = 'daily'
    WHERE "reminderRepeat" IS NULL;

    ALTER TABLE "Habit"
      ALTER COLUMN "reminderRepeat" SET NOT NULL;
  END IF;
END $$;

-- ✅ Ensure habitId exists (shadow-safe)
ALTER TABLE "reminders"
  ADD COLUMN IF NOT EXISTS "habitId" INTEGER;

-- Add new reminder source fields
ALTER TABLE "reminders"
  ADD COLUMN IF NOT EXISTS "sourceDate" DATE,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT;

-- Replace old unique index (habitId only) with composite unique
DROP INDEX IF EXISTS "reminders_habitId_key";

-- ✅ Create composite unique only if habitId column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reminders'
      AND column_name = 'habitId'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "reminders_userId_habitId_sourceType_sourceDate_key"
    ON "reminders"("userId", "habitId", "sourceType", "sourceDate");
  END IF;
END $$;

-- Update FK to SET NULL (older migration used CASCADE)
ALTER TABLE "reminders"
  DROP CONSTRAINT IF EXISTS "reminders_habitId_fkey";

-- ✅ Add FK only if habitId exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reminders'
      AND column_name = 'habitId'
  ) THEN
    ALTER TABLE "reminders"
      ADD CONSTRAINT "reminders_habitId_fkey"
      FOREIGN KEY ("habitId") REFERENCES "Habit"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
