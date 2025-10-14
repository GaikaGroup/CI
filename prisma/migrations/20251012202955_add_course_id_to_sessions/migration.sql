-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "course_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_course_sessions" ON "sessions"("course_id", "updated_at" DESC);
