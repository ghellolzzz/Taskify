-- CreateTable
CREATE TABLE "community_notes" (
    "id" SERIAL NOT NULL,
    "content" VARCHAR(280) NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "community_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_reactions" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "noteId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "note_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "note_reactions_userId_noteId_type_key" ON "note_reactions"("userId", "noteId", "type");

-- AddForeignKey
ALTER TABLE "community_notes" ADD CONSTRAINT "community_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_reactions" ADD CONSTRAINT "note_reactions_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "community_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_reactions" ADD CONSTRAINT "note_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
