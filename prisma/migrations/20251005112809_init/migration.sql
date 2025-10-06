-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "preview" TEXT,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "mode" VARCHAR(20) NOT NULL DEFAULT 'fun',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_sessions" ON "sessions"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_session_search" ON "sessions"("title", "preview");

-- CreateIndex
CREATE INDEX "idx_session_messages" ON "messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
