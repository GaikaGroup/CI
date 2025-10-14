-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "idx_session_visibility" ON "sessions"("is_hidden");
