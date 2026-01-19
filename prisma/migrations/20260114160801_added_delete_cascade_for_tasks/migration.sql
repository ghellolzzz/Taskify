-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_teamId_fkey";

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
