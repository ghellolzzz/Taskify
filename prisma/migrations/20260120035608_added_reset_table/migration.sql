-- CreateTable
CREATE TABLE "UserFocusSetting" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "preferredTheme" TEXT NOT NULL DEFAULT 'drink',
    "preferredDrink" TEXT NOT NULL DEFAULT 'coffee',
    "backgroundColor" TEXT NOT NULL DEFAULT '#fdf6e3',

    CONSTRAINT "UserFocusSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFocusSetting_userId_key" ON "UserFocusSetting"("userId");

-- AddForeignKey
ALTER TABLE "UserFocusSetting" ADD CONSTRAINT "UserFocusSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
